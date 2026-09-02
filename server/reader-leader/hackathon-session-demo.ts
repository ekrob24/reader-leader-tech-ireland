import {
  CreateHackathonSessionInput,
  HackathonDemoSummary,
  HackathonSessionRecord,
  MockTraceEvent,
  RecordMockUploadInput,
  ResetHackathonDemoInput,
  ResetHackathonDemoResult,
  RetryMockAnalysisInput,
  RunMockAnalysisInput,
} from "@shared/hackathon-session-demo";
import { getSupabaseAdminClient } from "../supabase";
import { ManusActor, resolveSupabaseUserId } from "./override-persistence";

const sessionRoles = new Set(["school_admin", "literacy_lead", "teacher_set"]);
const resetRoles = new Set(["school_admin", "literacy_lead"]);
type Membership = { user_id: string; organisation_id: string; role: string };
type SessionRow = { id: string; learner_id: string; passage_id: string; organisation_id: string; status: "CREATED" | "UPLOADING" | "ANALYSING" | "READY" | "BLOCKED" | "FAILED" };
type JobRow = { id: string; session_id: string; status: "QUEUED" | "RUNNING" | "READY" | "FAILED" | "RETRYING" | "BLOCKED"; attempt_count: number; trace_id: string };

export function hasActiveAssessmentConsent(consent: { status: string; retention_until: string } | null | undefined, now = Date.now()) {
  return Boolean(consent && consent.status === "ACTIVE" && new Date(consent.retention_until).getTime() > now);
}

async function staffForOrganisation(actor: ManusActor, organisationId: string) {
  const userId = await resolveSupabaseUserId(actor);
  const { data, error } = await getSupabaseAdminClient().from("memberships").select("user_id, organisation_id, role").eq("user_id", userId).eq("organisation_id", organisationId).maybeSingle();
  const membership = data as Membership | null;
  if (error || !membership || !sessionRoles.has(membership.role)) throw new Error("Teacher access to this organisation could not be verified");
  return membership;
}

async function sessionForStaff(actor: ManusActor, sessionId: string) {
  const { data, error } = await getSupabaseAdminClient().from("reading_sessions").select("id, learner_id, passage_id, organisation_id, status").eq("id", sessionId).maybeSingle();
  const session = data as SessionRow | null;
  if (error || !session) throw new Error("Reading session was not found");
  await staffForOrganisation(actor, session.organisation_id);
  return session;
}

async function activeConsentFor(learnerId: string) {
  const { data, error } = await getSupabaseAdminClient().from("consents").select("status, retention_until").eq("learner_id", learnerId).eq("purpose", "READING_ASSESSMENT").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const active = hasActiveAssessmentConsent(data);
  if (error || !active) throw new Error("Active guardian consent is required before creating or uploading a reading session");
  return "ACTIVE" as const;
}

async function appendTrace(traceId: string, sessionId: string, stage: "SESSION_CONSENT_CHECKED" | "MOCK_UPLOAD_RECORDED" | "ANALYSIS_QUEUED" | "ANALYSIS_STARTED" | "EVIDENCE_COMPOSED" | "POLICY_GATE_PASSED" | "ANALYSIS_READY" | "ANALYSIS_RETRYING" | "ANALYSIS_BLOCKED", safeSummary: string) {
  const { error } = await getSupabaseAdminClient().from("mock_analysis_trace_events").insert({ trace_id: traceId, session_id: sessionId, stage, safe_summary: safeSummary });
  if (error) throw new Error("Unable to append the mock analysis trace");
}

async function buildSessionRecord(row: SessionRow): Promise<HackathonSessionRecord> {
  const client = getSupabaseAdminClient();
  const [{ data: upload }, { data: job }, { data: traces }, { data: consent }] = await Promise.all([
    client.from("mock_session_uploads").select("upload_status").eq("session_id", row.id).maybeSingle(),
    client.from("mock_analysis_jobs").select("id, session_id, status, attempt_count, trace_id").eq("session_id", row.id).maybeSingle(),
    client.from("mock_analysis_trace_events").select("id, trace_id, session_id, stage, safe_summary, created_at").eq("session_id", row.id).order("created_at", { ascending: true }),
    client.from("consents").select("status, retention_until").eq("learner_id", row.learner_id).eq("purpose", "READING_ASSESSMENT").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const consentActive = hasActiveAssessmentConsent(consent);
  const jobRecord = job as JobRow | null;
  return HackathonSessionRecord.parse({
    id: row.id, learnerId: row.learner_id, passageId: row.passage_id, organisationId: row.organisation_id, sessionStatus: row.status,
    uploadStatus: upload?.upload_status ?? "NOT_STARTED", consentStatus: consentActive ? "ACTIVE" : (consent?.status ?? "EXPIRED"), mayProcessData: consentActive,
    job: jobRecord ? { id: jobRecord.id, status: jobRecord.status, attemptCount: jobRecord.attempt_count, traceId: jobRecord.trace_id } : null,
    traces: (traces ?? []).map(event => MockTraceEvent.parse({ id: event.id, traceId: event.trace_id, sessionId: event.session_id, stage: event.stage, safeSummary: event.safe_summary, createdAt: new Date(event.created_at).toISOString() })),
  });
}

export async function createHackathonSession(actor: ManusActor, input: CreateHackathonSessionInput) {
  const { data: learner, error: learnerError } = await getSupabaseAdminClient().from("learners").select("id, organisation_id").eq("id", input.learnerId).maybeSingle();
  if (learnerError || !learner) throw new Error("Learner was not found");
  await staffForOrganisation(actor, learner.organisation_id);
  await activeConsentFor(input.learnerId);
  const { data: passage, error: passageError } = await getSupabaseAdminClient().from("passages").select("id").eq("id", input.passageId).eq("organisation_id", learner.organisation_id).eq("approval_status", "APPROVED").maybeSingle();
  if (passageError || !passage) throw new Error("Select an approved passage from this learner’s organisation");
  const { data, error } = await getSupabaseAdminClient().from("reading_sessions").insert({ organisation_id: learner.organisation_id, learner_id: input.learnerId, passage_id: input.passageId, status: "CREATED", demo_mode: true, idempotency_key: input.idempotencyKey }).select("id, learner_id, passage_id, organisation_id, status").single();
  if (error || !data) throw new Error(error?.code === "23505" ? "Session idempotency key has already been used" : "Unable to create a consent-gated session");
  return buildSessionRecord(data as SessionRow);
}

export async function recordMockUpload(actor: ManusActor, input: RecordMockUploadInput) {
  const session = await sessionForStaff(actor, input.sessionId);
  await activeConsentFor(session.learner_id);
  if (session.status !== "CREATED") throw new Error("This session is not ready for a mocked upload");
  const { error } = await getSupabaseAdminClient().from("mock_session_uploads").insert({ session_id: session.id, upload_status: "UPLOADED", file_name: input.fileName, media_type: input.mediaType, byte_size: input.byteSize, idempotency_key: input.idempotencyKey });
  if (error) throw new Error(error.code === "23505" ? "Mock upload idempotency key has already been used" : "Unable to record the mock upload");
  const { error: sessionError } = await getSupabaseAdminClient().from("reading_sessions").update({ status: "ANALYSING", started_at: new Date().toISOString() }).eq("id", session.id);
  if (sessionError) throw new Error("Unable to advance the mock session");
  const { data: job, error: jobError } = await getSupabaseAdminClient().from("mock_analysis_jobs").insert({ session_id: session.id, status: "QUEUED", idempotency_key: session.id }).select("trace_id").single();
  if (jobError || !job) throw new Error("Unable to queue mock analysis");
  await appendTrace(job.trace_id, session.id, "SESSION_CONSENT_CHECKED", "Active guardian consent was verified before mock processing.");
  await appendTrace(job.trace_id, session.id, "MOCK_UPLOAD_RECORDED", "Mock audio metadata was recorded; no audio bytes were uploaded.");
  await appendTrace(job.trace_id, session.id, "ANALYSIS_QUEUED", "Deterministic mock analysis was queued for adult review.");
  return buildSessionRecord({ ...session, status: "ANALYSING" });
}

export async function runMockAnalysis(actor: ManusActor, input: RunMockAnalysisInput) {
  const session = await sessionForStaff(actor, input.sessionId);
  await activeConsentFor(session.learner_id);
  const { data: job, error } = await getSupabaseAdminClient().from("mock_analysis_jobs").select("id, session_id, status, attempt_count, trace_id").eq("session_id", session.id).in("status", ["QUEUED", "RETRYING"]).maybeSingle();
  const jobRow = job as JobRow | null;
  if (error || !jobRow) throw new Error("No queued mock analysis is available for this session");
  const client = getSupabaseAdminClient();
  await client.from("mock_analysis_jobs").update({ status: "RUNNING", updated_at: new Date().toISOString() }).eq("id", jobRow.id);
  await appendTrace(jobRow.trace_id, session.id, "ANALYSIS_STARTED", "Mock analysis began with the approved passage as fixed context.");
  await appendTrace(jobRow.trace_id, session.id, "EVIDENCE_COMPOSED", "A deterministic evidence bundle was composed for adult review.");
  await appendTrace(jobRow.trace_id, session.id, "POLICY_GATE_PASSED", "The bounded policy gate returned a safe reviewable action.");
  await appendTrace(jobRow.trace_id, session.id, "ANALYSIS_READY", "Mock analysis is ready; adults retain final review authority.");
  await client.from("mock_analysis_jobs").update({ status: "READY", updated_at: new Date().toISOString() }).eq("id", jobRow.id);
  await client.from("reading_sessions").update({ status: "READY", completed_at: new Date().toISOString() }).eq("id", session.id);
  return buildSessionRecord({ ...session, status: "READY" });
}

export async function retryMockAnalysis(actor: ManusActor, input: RetryMockAnalysisInput) {
  const { data, error } = await getSupabaseAdminClient().from("mock_analysis_jobs").select("id, session_id, status, attempt_count, trace_id").eq("id", input.jobId).maybeSingle();
  const job = data as JobRow | null;
  if (error || !job) throw new Error("Mock analysis job was not found");
  const session = await sessionForStaff(actor, job.session_id);
  await activeConsentFor(session.learner_id);
  if (!['FAILED', 'BLOCKED'].includes(job.status) || job.attempt_count >= 3) throw new Error("This mock analysis job is not eligible for retry");
  await getSupabaseAdminClient().from("mock_analysis_jobs").update({ status: "RETRYING", attempt_count: job.attempt_count + 1, updated_at: new Date().toISOString() }).eq("id", job.id);
  await appendTrace(job.trace_id, session.id, "ANALYSIS_RETRYING", "A bounded mock retry was requested by an authorised adult.");
  return buildSessionRecord(session);
}

export async function getHackathonDemoSummary(actor: ManusActor, organisationId: string) {
  await staffForOrganisation(actor, organisationId);
  const { data, error } = await getSupabaseAdminClient().from("reading_sessions").select("id, learner_id, passage_id, organisation_id, status").eq("organisation_id", organisationId).order("created_at", { ascending: false }).limit(12);
  if (error) throw new Error("Unable to load hackathon session records");
  const sessions = await Promise.all((data as SessionRow[] ?? []).map(buildSessionRecord));
  return HackathonDemoSummary.parse({
    organisationId,
    sessions,
    activeConsentCount: sessions.filter(session => session.mayProcessData).length,
    blockedSessionCount: sessions.filter(session => !session.mayProcessData || session.sessionStatus === "BLOCKED").length,
    queuedOrRunningJobCount: sessions.filter(session => session.job && ["QUEUED", "RUNNING", "RETRYING"].includes(session.job.status)).length,
  });
}

export async function getHackathonSession(actor: ManusActor, sessionId: string) {
  return buildSessionRecord(await sessionForStaff(actor, sessionId));
}

export async function resetHackathonDemoSessions(actor: ManusActor, input: ResetHackathonDemoInput) {
  const membership = await staffForOrganisation(actor, input.organisationId);
  if (!resetRoles.has(membership.role)) throw new Error("Only a school lead may reset synthetic demo sessions");
  const { data, error } = await getSupabaseAdminClient().from("reading_sessions").delete().eq("organisation_id", input.organisationId).eq("demo_mode", true).select("id");
  if (error) throw new Error("Unable to reset synthetic demo sessions");
  return ResetHackathonDemoResult.parse({ deletedSessions: data?.length ?? 0 });
}

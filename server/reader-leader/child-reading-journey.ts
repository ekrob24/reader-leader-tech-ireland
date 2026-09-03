import { createHash, randomBytes } from "crypto";
import { ChildReadingView, ChildSessionActionInput, ChildSessionLaunch, ChildSessionTokenInput, LaunchChildSessionInput, MockWordEvent, TeacherMockReview, TeacherSessionReviewInput } from "@shared/child-reading-journey";
import { getSupabaseAdminClient } from "../supabase";
import { ManusActor, resolveSupabaseUserId } from "./override-persistence";
import { hasActiveAssessmentConsent } from "./hackathon-session-demo";

const teacherRoles = new Set(["school_admin", "literacy_lead", "teacher_set"]);
const CHILD_TOKEN_TTL_MS = 30 * 60 * 1000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const childMessage = (state: "READY_TO_START" | "READING" | "COMPLETED", helpRequested: boolean) => state === "COMPLETED" ? "Thank you for reading. Your teacher will look at the next step with you." : helpRequested ? "That is okay. Your teacher will help you when they can. Keep reading at your own pace." : state === "READING" ? "Read at your own pace. You can ask for help whenever you need it." : "When you are ready, start reading at your own pace.";

type SessionRow = { id: string; organisation_id: string; learner_id: string; passage_id: string; demo_mode: boolean; status: "CREATED" | "CHILD_READING" | "COMPLETED" | "READY" };
type TokenRow = { session_id: string; expires_at: string; started_at: string | null; completed_at: string | null; help_requested_at: string | null };

async function verifyTeacher(actor: ManusActor, organisationId: string) {
  const userId = await resolveSupabaseUserId(actor);
  const { data, error } = await getSupabaseAdminClient().from("memberships").select("role").eq("user_id", userId).eq("organisation_id", organisationId).maybeSingle();
  if (error || !data || !teacherRoles.has(data.role)) throw new Error("Teacher access to this organisation could not be verified");
  return userId;
}
async function teacherSession(actor: ManusActor, sessionId: string) {
  const { data, error } = await getSupabaseAdminClient().from("reading_sessions").select("id, organisation_id, learner_id, passage_id, demo_mode, status").eq("id", sessionId).maybeSingle();
  const session = data as SessionRow | null;
  if (error || !session) throw new Error("Reading session was not found");
  await verifyTeacher(actor, session.organisation_id);
  return session;
}
async function activeChildToken(token: string) {
  const client = getSupabaseAdminClient();
  const { data: tokenRow, error } = await client.from("child_session_tokens").select("session_id, expires_at, started_at, completed_at, help_requested_at").eq("token_hash", hashToken(token)).maybeSingle();
  const tokenData = tokenRow as TokenRow | null;
  if (error || !tokenData || new Date(tokenData.expires_at).getTime() <= Date.now()) throw new Error("This reading link is no longer available");
  const { data: session } = await client.from("reading_sessions").select("id, organisation_id, learner_id, passage_id, demo_mode, status").eq("id", tokenData.session_id).maybeSingle();
  const sessionData = session as SessionRow | null;
  if (!sessionData || !sessionData.demo_mode || !["CREATED", "CHILD_READING", "COMPLETED", "READY"].includes(sessionData.status)) throw new Error("This reading link is no longer available");
  const { data: consent } = await client.from("consents").select("status, retention_until").eq("learner_id", sessionData.learner_id).eq("purpose", "READING_ASSESSMENT").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!hasActiveAssessmentConsent(consent)) throw new Error("This reading link is no longer available");
  return { tokenData, session: sessionData };
}
async function childViewFor(token: string) {
  const { tokenData, session } = await activeChildToken(token);
  const { data: passage } = await getSupabaseAdminClient().from("passages").select("title, body, approval_status").eq("id", session.passage_id).eq("organisation_id", session.organisation_id).maybeSingle();
  if (!passage || passage.approval_status !== "APPROVED") throw new Error("This passage is not available");
  const state = tokenData.completed_at || ["COMPLETED", "READY"].includes(session.status) ? "COMPLETED" : tokenData.started_at || session.status === "CHILD_READING" ? "READING" : "READY_TO_START";
  return { tokenData, session, view: ChildReadingView.parse({ state, passage: { title: passage.title, body: passage.body }, helpRequested: Boolean(tokenData.help_requested_at), mockOnly: true, childMessage: childMessage(state, Boolean(tokenData.help_requested_at)) }) };
}

export async function launchChildSession(actor: ManusActor, input: LaunchChildSessionInput) {
  const session = await teacherSession(actor, input.sessionId);
  if (!session.demo_mode) throw new Error("Only a synthetic demo session may be launched in the child reader");
  const { data: consent } = await getSupabaseAdminClient().from("consents").select("status, retention_until").eq("learner_id", session.learner_id).eq("purpose", "READING_ASSESSMENT").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!hasActiveAssessmentConsent(consent)) throw new Error("Active guardian consent is required before launching a child reading session");
  const { data: passage } = await getSupabaseAdminClient().from("passages").select("approval_status").eq("id", session.passage_id).maybeSingle();
  if (!passage || passage.approval_status !== "APPROVED") throw new Error("Only an approved passage may be launched for a child");
  const token = randomBytes(32).toString("base64url"); const expiresAt = new Date(Date.now() + CHILD_TOKEN_TTL_MS).toISOString(); const actorId = await resolveSupabaseUserId(actor);
  const { error } = await getSupabaseAdminClient().from("child_session_tokens").insert({ session_id: session.id, token_hash: hashToken(token), expires_at: expiresAt, created_by: actorId });
  if (error) throw new Error("Unable to create the child reading link");
  return ChildSessionLaunch.parse({ childPath: `/read/${token}`, expiresAt, mockOnly: true });
}
export async function getChildReadingView(input: ChildSessionTokenInput) { return (await childViewFor(input.token)).view; }
export async function startChildReading(input: ChildSessionActionInput) {
  const { tokenData, session } = await childViewFor(input.token);
  if (!tokenData.started_at && !tokenData.completed_at) {
    const now = new Date().toISOString(); const client = getSupabaseAdminClient();
    await client.from("child_session_tokens").update({ started_at: now }).eq("token_hash", hashToken(input.token));
    await client.from("reading_sessions").update({ status: "CHILD_READING", started_at: now }).eq("id", session.id);
  }
  return (await childViewFor(input.token)).view;
}
export async function requestChildHelp(input: ChildSessionActionInput) {
  const { tokenData } = await childViewFor(input.token);
  if (!tokenData.completed_at && !tokenData.help_requested_at) await getSupabaseAdminClient().from("child_session_tokens").update({ help_requested_at: new Date().toISOString() }).eq("token_hash", hashToken(input.token));
  return (await childViewFor(input.token)).view;
}
const mockEvents = [
  { token_index: 2, reference_word: "through", event_type: "SUBSTITUTION" as const, suggested_action: "PROMPT" as const, teacher_note: "Synthetic substitution for the teacher to review; invite a calm retry before modelling." },
  { token_index: 7, reference_word: "harbour", event_type: "SELF_CORRECTION" as const, suggested_action: "STAY_SILENT" as const, teacher_note: "Synthetic self-correction; no interruption is recommended." },
  { token_index: 12, reference_word: "quietly", event_type: "HESITATION" as const, suggested_action: "ESCALATE" as const, teacher_note: "Synthetic hesitation; listen with the learner before choosing a next step." },
];
export async function completeChildReading(input: ChildSessionActionInput) {
  const { tokenData, session } = await childViewFor(input.token);
  if (!tokenData.completed_at) {
    const client = getSupabaseAdminClient(); const now = new Date().toISOString();
    await client.from("child_session_tokens").update({ completed_at: now }).eq("token_hash", hashToken(input.token));
    await client.from("reading_sessions").update({ status: "COMPLETED", completed_at: now }).eq("id", session.id);
    const { error } = await client.from("mock_word_events").upsert(mockEvents.map(event => ({ session_id: session.id, ...event })), { onConflict: "session_id,token_index", ignoreDuplicates: true });
    if (error) throw new Error("Unable to prepare the mock teacher review record");
  }
  return (await childViewFor(input.token)).view;
}
export async function getTeacherMockReview(actor: ManusActor, input: TeacherSessionReviewInput) {
  const session = await teacherSession(actor, input.sessionId);
  const client = getSupabaseAdminClient();
  const [{ data: passage }, { data: events }] = await Promise.all([client.from("passages").select("title").eq("id", session.passage_id).maybeSingle(), client.from("mock_word_events").select("id, token_index, reference_word, event_type, suggested_action, teacher_note").eq("session_id", session.id).order("token_index", { ascending: true })]);
  if (!passage) throw new Error("Session passage was not found");
  return TeacherMockReview.parse({ sessionId: session.id, sessionStatus: session.status, passageTitle: passage.title, mockOnly: true, awaitingChild: !["COMPLETED", "READY"].includes(session.status), wordEvents: (events ?? []).map(event => MockWordEvent.parse({ id: event.id, tokenIndex: event.token_index, referenceWord: event.reference_word, eventType: event.event_type, suggestedAction: event.suggested_action, teacherNote: event.teacher_note })) });
}

import {
  ConsentWithdrawalRecord,
  DataDeletionReceipt,
  DataDeletionRequestRecord,
  GuardianConsentRecord,
  RecordGuardianConsentInput,
  RequestDataDeletionInput,
  RetentionEligibility,
  WithdrawGuardianConsentInput,
} from "@shared/consent-lifecycle";
import { getSupabaseAdminClient } from "../supabase";
import { logContractBoundaryFailure, ReaderLeaderContractBoundaryError } from "./contract-boundary";
import { ManusActor, resolveSupabaseUserId } from "./override-persistence";

type GuardianLink = { guardian_id: string; learner_id: string; organisation_id: string };
type ConsentRow = {
  id: string; learner_id: string; guardian_id: string; purpose: string; training_opt_in: boolean;
  consent_text_version: string; policy_version: string; retention_until: string; status: string; created_at: string;
};
type DeletionRequestRow = {
  id: string; learner_id: string; guardian_id: string; scope: string; status: string; requested_at: string; completed_at: string | null;
};

export type DeletionExecutor = {
  deleteAudioAsset: (asset: { id: string; storageObjectHash: string }) => Promise<"DELETED" | "NOT_FOUND" | "BLOCKED">;
  deleteDerivedData: (asset: { id: string; storageObjectHash: string | null }) => Promise<"DELETED" | "NOT_FOUND" | "BLOCKED">;
};

function nowIso() { return new Date().toISOString(); }

function parseOrThrow<T>(source: "learner_row" | "timeline_row" | "audit_row", parser: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: unknown } }, value: unknown, code: "LEARNER_RECORD_INVALID" | "TIMELINE_RECORD_INVALID" | "AUDIT_RECORD_INVALID"): T {
  const result = parser.safeParse(value);
  if (result.success) return result.data;
  logContractBoundaryFailure(source, result.error);
  throw new ReaderLeaderContractBoundaryError(code, source);
}

function guardianConsentRecord(row: ConsentRow): GuardianConsentRecord {
  return parseOrThrow("audit_row", GuardianConsentRecord, {
    id: row.id,
    learnerId: row.learner_id,
    guardianId: row.guardian_id,
    purpose: row.purpose,
    trainingOptIn: row.training_opt_in,
    consentTextVersion: row.consent_text_version,
    policyVersion: row.policy_version,
    retentionUntil: new Date(row.retention_until).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
  }, "AUDIT_RECORD_INVALID");
}

function deletionRequestRecord(row: DeletionRequestRow): DataDeletionRequestRecord {
  return parseOrThrow("audit_row", DataDeletionRequestRecord, {
    id: row.id,
    learnerId: row.learner_id,
    guardianId: row.guardian_id,
    scope: row.scope,
    status: row.status,
    requestedAt: new Date(row.requested_at).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
  }, "AUDIT_RECORD_INVALID");
}

async function guardianLinkFor(actor: ManusActor, learnerId: string): Promise<{ guardianId: string; organisationId: string }> {
  const guardianId = await resolveSupabaseUserId(actor);
  const { data, error } = await getSupabaseAdminClient()
    .from("guardian_learner_links")
    .select("guardian_id, learner_id, organisation_id")
    .eq("guardian_id", guardianId)
    .eq("learner_id", learnerId)
    .maybeSingle();
  const link = data as GuardianLink | null;
  if (error || !link || link.guardian_id !== guardianId || link.learner_id !== learnerId) {
    throw new Error("Guardian access to this learner could not be verified");
  }
  return { guardianId, organisationId: link.organisation_id };
}

async function appendLifecycleAudit(input: { organisationId: string; learnerId: string; guardianId: string; action: "GUARDIAN_CONSENT_RECORDED" | "GUARDIAN_CONSENT_WITHDRAWN" | "DATA_DELETION_REQUESTED" | "AUDIO_DELETION_VERIFIED" | "DERIVED_DATA_DELETION_VERIFIED"; deletionRequestId?: string }) {
  const { error } = await getSupabaseAdminClient().from("data_lifecycle_audit_events").insert({
    organisation_id: input.organisationId,
    learner_id: input.learnerId,
    guardian_id: input.guardianId,
    deletion_request_id: input.deletionRequestId ?? null,
    action: input.action,
  });
  if (error) throw new Error("Unable to append lifecycle audit event");
}

export function deriveRetentionEligibility(learnerId: string, consent: Pick<ConsentRow, "learner_id" | "purpose" | "status" | "retention_until"> | null, now = new Date()): RetentionEligibility {
  if (!consent) return { learnerId, purpose: "READING_ASSESSMENT", status: "EXPIRED", mayProcessData: false, retentionUntil: null };
  const retentionUntil = new Date(consent.retention_until);
  const active = consent.status === "ACTIVE" && !Number.isNaN(retentionUntil.getTime()) && retentionUntil > now;
  return {
    learnerId: consent.learner_id,
    purpose: "READING_ASSESSMENT",
    status: active ? "ACTIVE" : consent.status === "ACTIVE" ? "EXPIRED" : consent.status as RetentionEligibility["status"],
    mayProcessData: active,
    retentionUntil: Number.isNaN(retentionUntil.getTime()) ? null : retentionUntil.toISOString(),
  };
}

export async function recordGuardianConsent(actor: ManusActor, input: RecordGuardianConsentInput): Promise<GuardianConsentRecord> {
  const link = await guardianLinkFor(actor, input.learnerId);
  const { data, error } = await getSupabaseAdminClient().from("consents").insert({
    learner_id: input.learnerId,
    guardian_id: link.guardianId,
    purpose: input.purpose,
    training_opt_in: input.trainingOptIn,
    retention_until: input.retentionUntil,
    status: "ACTIVE",
    consent_text_version: input.consentTextVersion,
    policy_version: input.policyVersion,
    idempotency_key: input.idempotencyKey,
  }).select("id, learner_id, guardian_id, purpose, training_opt_in, consent_text_version, policy_version, retention_until, status, created_at").single();
  if (error || !data) throw new Error(error?.code === "23505" ? "Consent idempotency key has already been used" : "Unable to record guardian consent");
  await appendLifecycleAudit({ ...link, learnerId: input.learnerId, action: "GUARDIAN_CONSENT_RECORDED" });
  return guardianConsentRecord(data as ConsentRow);
}

export async function withdrawGuardianConsent(actor: ManusActor, input: WithdrawGuardianConsentInput): Promise<ConsentWithdrawalRecord> {
  const guardianId = await resolveSupabaseUserId(actor);
  const { data: consent, error: consentError } = await getSupabaseAdminClient().from("consents")
    .select("id, learner_id, guardian_id, purpose")
    .eq("id", input.consentId)
    .eq("guardian_id", guardianId)
    .maybeSingle();
  if (consentError || !consent) throw new Error("Guardian access to this consent could not be verified");
  const link = await guardianLinkFor(actor, consent.learner_id);
  const { data, error } = await getSupabaseAdminClient().from("consent_withdrawals").insert({
    consent_id: input.consentId,
    learner_id: consent.learner_id,
    guardian_id: guardianId,
    reason: input.reason,
    idempotency_key: input.idempotencyKey,
  }).select("id, consent_id, learner_id, guardian_id, reason, requested_at").single();
  if (error || !data) throw new Error(error?.code === "23505" ? "Consent withdrawal has already been recorded" : "Unable to record consent withdrawal");
  await appendLifecycleAudit({ ...link, learnerId: consent.learner_id, action: "GUARDIAN_CONSENT_WITHDRAWN" });
  return parseOrThrow("audit_row", ConsentWithdrawalRecord, {
    id: (data as { id: string }).id,
    consentId: (data as { consent_id: string }).consent_id,
    learnerId: (data as { learner_id: string }).learner_id,
    guardianId: (data as { guardian_id: string }).guardian_id,
    reason: (data as { reason: string }).reason,
    requestedAt: new Date((data as { requested_at: string }).requested_at).toISOString(),
  }, "AUDIT_RECORD_INVALID");
}

export async function requestDataDeletion(actor: ManusActor, input: RequestDataDeletionInput): Promise<DataDeletionRequestRecord> {
  const link = await guardianLinkFor(actor, input.learnerId);
  const { data: latestConsent, error: consentError } = await getSupabaseAdminClient().from("consents")
    .select("id, status")
    .eq("learner_id", input.learnerId)
    .eq("guardian_id", link.guardianId)
    .eq("purpose", "READING_ASSESSMENT")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (consentError || !latestConsent || !["WITHDRAWN", "PENDING_DELETION"].includes(latestConsent.status)) {
    throw new Error("Withdraw guardian consent before requesting data deletion");
  }
  const { data, error } = await getSupabaseAdminClient().from("data_deletion_requests").insert({
    learner_id: input.learnerId,
    guardian_id: link.guardianId,
    organisation_id: link.organisationId,
    scope: input.scope,
    status: "REQUESTED",
    idempotency_key: input.idempotencyKey,
  }).select("id, learner_id, guardian_id, scope, status, requested_at, completed_at").single();
  if (error || !data) throw new Error(error?.code === "23505" ? "Data deletion request has already been recorded" : "Unable to request data deletion");
  const request = deletionRequestRecord(data as DeletionRequestRow);
  await appendLifecycleAudit({ ...link, learnerId: input.learnerId, action: "DATA_DELETION_REQUESTED", deletionRequestId: request.id });
  return request;
}

export async function getRetentionEligibility(actor: ManusActor, learnerId: string): Promise<RetentionEligibility> {
  const link = await guardianLinkFor(actor, learnerId);
  const { data, error } = await getSupabaseAdminClient().from("consents")
    .select("learner_id, purpose, status, retention_until")
    .eq("learner_id", learnerId)
    .eq("guardian_id", link.guardianId)
    .eq("purpose", "READING_ASSESSMENT")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Unable to read consent retention state");
  return deriveRetentionEligibility(learnerId, data as Pick<ConsentRow, "learner_id" | "purpose" | "status" | "retention_until"> | null);
}

export async function processDeletionVerification(requestId: string, executor: DeletionExecutor): Promise<DataDeletionRequestRecord> {
  const client = getSupabaseAdminClient();
  const { data: request, error: requestError } = await client.from("data_deletion_requests")
    .select("id, learner_id, guardian_id, organisation_id, scope, status, requested_at, completed_at")
    .eq("id", requestId)
    .in("status", ["REQUESTED", "PROCESSING"])
    .maybeSingle();
  if (requestError || !request) throw new Error("Deletion request is not available for verification");
  const row = request as DeletionRequestRow & { organisation_id: string };
  await client.from("data_deletion_requests").update({ status: "PROCESSING" }).eq("id", requestId);
  const [{ data: audioAssets, error: audioError }, { data: derivedAssets, error: derivedError }] = await Promise.all([
    client.from("audio_assets").select("id, storage_object_hash").eq("learner_id", row.learner_id).is("deleted_at", null),
    client.from("derived_data_assets").select("id, storage_object_hash").eq("learner_id", row.learner_id).is("deleted_at", null),
  ]);
  if (audioError || derivedError) throw new Error("Unable to load deletion inventory");
  const verifiedAt = nowIso();
  let blocked = false;
  for (const asset of audioAssets ?? []) {
    const outcome = await executor.deleteAudioAsset({ id: asset.id, storageObjectHash: asset.storage_object_hash });
    if (outcome === "BLOCKED") blocked = true;
    if (outcome !== "BLOCKED") await client.from("audio_assets").update({ deleted_at: verifiedAt, deletion_request_id: requestId }).eq("id", asset.id);
    await client.from("data_deletion_receipts").insert({ request_id: requestId, target_kind: "AUDIO_ASSET", target_reference_hash: asset.storage_object_hash, outcome, verified_at: verifiedAt });
    await appendLifecycleAudit({ organisationId: row.organisation_id, learnerId: row.learner_id, guardianId: row.guardian_id, deletionRequestId: requestId, action: "AUDIO_DELETION_VERIFIED" });
  }
  for (const asset of derivedAssets ?? []) {
    const outcome = await executor.deleteDerivedData({ id: asset.id, storageObjectHash: asset.storage_object_hash });
    if (outcome === "BLOCKED") blocked = true;
    if (outcome !== "BLOCKED") await client.from("derived_data_assets").update({ deleted_at: verifiedAt, deletion_request_id: requestId }).eq("id", asset.id);
    const referenceHash = asset.storage_object_hash ?? "0".repeat(64);
    await client.from("data_deletion_receipts").insert({ request_id: requestId, target_kind: "DERIVED_DATA", target_reference_hash: referenceHash, outcome, verified_at: verifiedAt });
    await appendLifecycleAudit({ organisationId: row.organisation_id, learnerId: row.learner_id, guardianId: row.guardian_id, deletionRequestId: requestId, action: "DERIVED_DATA_DELETION_VERIFIED" });
  }
  const status = blocked ? "BLOCKED" : "COMPLETED";
  const { data: completed, error: completeError } = await client.from("data_deletion_requests")
    .update({ status, completed_at: blocked ? null : verifiedAt })
    .eq("id", requestId)
    .select("id, learner_id, guardian_id, scope, status, requested_at, completed_at")
    .single();
  if (completeError || !completed) throw new Error("Unable to finalize deletion verification");
  return deletionRequestRecord(completed as DeletionRequestRow);
}

export async function getDeletionStatus(actor: ManusActor, requestId: string) {
  const guardianId = await resolveSupabaseUserId(actor);
  const { data: request, error } = await getSupabaseAdminClient().from("data_deletion_requests")
    .select("id, learner_id, guardian_id, scope, status, requested_at, completed_at")
    .eq("id", requestId)
    .eq("guardian_id", guardianId)
    .maybeSingle();
  if (error || !request) throw new Error("Guardian access to this deletion request could not be verified");
  const { data: receipts, error: receiptError } = await getSupabaseAdminClient().from("data_deletion_receipts")
    .select("id, request_id, target_kind, target_reference_hash, outcome, verified_at")
    .eq("request_id", requestId)
    .order("verified_at", { ascending: true });
  if (receiptError) throw new Error("Unable to load deletion verification receipts");
  return {
    request: deletionRequestRecord(request as DeletionRequestRow),
    receipts: (receipts ?? []).map(row => parseOrThrow("audit_row", DataDeletionReceipt, {
      id: row.id,
      requestId: row.request_id,
      targetKind: row.target_kind,
      targetReferenceHash: row.target_reference_hash,
      outcome: row.outcome,
      verifiedAt: new Date(row.verified_at).toISOString(),
    }, "AUDIT_RECORD_INVALID")),
  };
}

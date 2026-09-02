import { z } from "zod";
import { LearnerId } from "./learner-safety-persistence";

export const GuardianId = z.string().uuid();
export const ConsentId = z.string().uuid();
export const DataDeletionRequestId = z.string().uuid();
export const DataDeletionReceiptId = z.string().uuid();

export const ConsentPurpose = z.enum(["READING_ASSESSMENT"]);
export const ConsentStatus = z.enum(["ACTIVE", "WITHDRAWN", "EXPIRED", "PENDING_DELETION", "DELETED"]);
export const WithdrawalReason = z.enum(["WITHDRAWAL_OF_CONSENT", "RETENTION_OBJECTION", "ACCOUNT_CLOSURE", "OTHER"]);
export const DeletionScope = z.enum(["AUDIO_AND_DERIVED_DATA"]);
export const DeletionRequestStatus = z.enum(["REQUESTED", "PROCESSING", "COMPLETED", "BLOCKED", "FAILED"]);
export const DeletionTargetKind = z.enum(["AUDIO_ASSET", "DERIVED_DATA"]);
export const DeletionReceiptOutcome = z.enum(["DELETED", "NOT_FOUND", "BLOCKED"]);
export const LifecycleAuditAction = z.enum([
  "GUARDIAN_CONSENT_RECORDED",
  "GUARDIAN_CONSENT_WITHDRAWN",
  "DATA_DELETION_REQUESTED",
  "AUDIO_DELETION_VERIFIED",
  "DERIVED_DATA_DELETION_VERIFIED",
]);

const version = z.string().trim().min(1).max(80);
const idempotencyKey = z.string().trim().min(8).max(120);
const utcTimestamp = z.string().datetime();

export const RecordGuardianConsentInput = z.object({
  learnerId: LearnerId,
  purpose: ConsentPurpose,
  trainingOptIn: z.literal(false).default(false),
  consentTextVersion: version,
  policyVersion: version,
  retentionUntil: utcTimestamp,
  idempotencyKey,
}).superRefine((value, context) => {
  if (Date.parse(value.retentionUntil) <= Date.now()) {
    context.addIssue({ code: "custom", path: ["retentionUntil"], message: "Retention must end in the future" });
  }
});
export type RecordGuardianConsentInput = z.infer<typeof RecordGuardianConsentInput>;

export const WithdrawGuardianConsentInput = z.object({
  consentId: ConsentId,
  reason: WithdrawalReason,
  idempotencyKey,
});
export type WithdrawGuardianConsentInput = z.infer<typeof WithdrawGuardianConsentInput>;

export const RequestDataDeletionInput = z.object({
  learnerId: LearnerId,
  scope: DeletionScope.default("AUDIO_AND_DERIVED_DATA"),
  idempotencyKey,
});
export type RequestDataDeletionInput = z.infer<typeof RequestDataDeletionInput>;

export const ProcessDeletionRequestInput = z.object({
  requestId: DataDeletionRequestId,
  operationId: z.string().trim().min(8).max(120),
});
export type ProcessDeletionRequestInput = z.infer<typeof ProcessDeletionRequestInput>;

export const GuardianConsentRecord = z.object({
  id: ConsentId,
  learnerId: LearnerId,
  guardianId: GuardianId,
  purpose: ConsentPurpose,
  trainingOptIn: z.literal(false),
  consentTextVersion: version,
  policyVersion: version,
  retentionUntil: utcTimestamp,
  createdAt: utcTimestamp,
});
export type GuardianConsentRecord = z.infer<typeof GuardianConsentRecord>;

export const ConsentWithdrawalRecord = z.object({
  id: z.string().uuid(),
  consentId: ConsentId,
  learnerId: LearnerId,
  guardianId: GuardianId,
  reason: WithdrawalReason,
  requestedAt: utcTimestamp,
});
export type ConsentWithdrawalRecord = z.infer<typeof ConsentWithdrawalRecord>;

export const RetentionEligibility = z.object({
  learnerId: LearnerId,
  purpose: ConsentPurpose,
  status: ConsentStatus,
  mayProcessData: z.boolean(),
  retentionUntil: utcTimestamp.nullable(),
});
export type RetentionEligibility = z.infer<typeof RetentionEligibility>;

export const DataDeletionRequestRecord = z.object({
  id: DataDeletionRequestId,
  learnerId: LearnerId,
  guardianId: GuardianId,
  scope: DeletionScope,
  status: DeletionRequestStatus,
  requestedAt: utcTimestamp,
  completedAt: utcTimestamp.nullable(),
});
export type DataDeletionRequestRecord = z.infer<typeof DataDeletionRequestRecord>;

export const DataDeletionReceipt = z.object({
  id: DataDeletionReceiptId,
  requestId: DataDeletionRequestId,
  targetKind: DeletionTargetKind,
  targetReferenceHash: z.string().regex(/^[a-f0-9]{64}$/),
  outcome: DeletionReceiptOutcome,
  verifiedAt: utcTimestamp,
});
export type DataDeletionReceipt = z.infer<typeof DataDeletionReceipt>;

export const LifecycleAuditEntry = z.object({
  id: z.string().uuid(),
  action: LifecycleAuditAction,
  learnerId: LearnerId,
  createdAt: utcTimestamp,
});
export type LifecycleAuditEntry = z.infer<typeof LifecycleAuditEntry>;

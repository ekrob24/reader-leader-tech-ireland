import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);
const boundedConfidence = z.number().finite().min(0).max(1);
const uuid = z.string().uuid();
const timestamp = z.coerce.date();

export const Action = z.enum(["PROMPT", "MODEL", "STAY_SILENT", "ESCALATE"]);
export type Action = z.infer<typeof Action>;

export const AppRole = z.enum([
  "school_admin",
  "literacy_lead",
  "teacher_set",
  "content_steward",
  "guardian",
  "learner",
]);
export type AppRole = z.infer<typeof AppRole>;

export const SessionStatus = z.enum([
  "CREATED",
  "UPLOADING",
  "ANALYSING",
  "READY",
  "BLOCKED",
  "FAILED",
]);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const EventType = z.enum([
  "CORRECT",
  "SUBSTITUTION",
  "OMISSION",
  "INSERTION",
  "REPETITION",
  "SELF_CORRECTION",
  "HESITATION",
  "UNCERTAIN",
]);
export type EventType = z.infer<typeof EventType>;

export const PronunciationContext = z.enum([
  "VALID_REGIONAL_VARIANT",
  "NOT_MATCHED",
  "UNCERTAIN",
]);
export type PronunciationContext = z.infer<typeof PronunciationContext>;

export const Organisation = z.object({
  id: uuid,
  name: nonEmptyText,
  region: z.string().trim().length(2),
  createdAt: timestamp,
});
export type Organisation = z.infer<typeof Organisation>;

export const Membership = z.object({
  userId: uuid,
  organisationId: uuid,
  role: AppRole,
});
export type Membership = z.infer<typeof Membership>;

export const Learner = z.object({
  id: uuid,
  organisationId: uuid,
  displayName: nonEmptyText,
  pronunciationSetId: nonEmptyText,
  createdAt: timestamp,
});
export type Learner = z.infer<typeof Learner>;

export const Consent = z.object({
  id: uuid,
  learnerId: uuid,
  guardianId: uuid,
  purpose: nonEmptyText,
  trainingOptIn: z.boolean(),
  retentionUntil: timestamp,
  withdrawnAt: timestamp.nullable(),
  createdAt: timestamp,
});
export type Consent = z.infer<typeof Consent>;

export const Passage = z.object({
  id: uuid,
  organisationId: uuid,
  title: nonEmptyText,
  body: nonEmptyText,
  version: z.number().int().positive(),
  regionTags: z.array(nonEmptyText),
  phonicsProfile: z.record(z.string(), z.unknown()),
  approvalStatus: z.enum(["DRAFT", "APPROVED", "RETIRED"]),
  rightsStatus: z.enum(["UNREVIEWED", "CLEARED", "BLOCKED"]),
  safetyStatus: z.enum(["UNREVIEWED", "PASSED", "BLOCKED"]),
  createdAt: timestamp,
});
export type Passage = z.infer<typeof Passage>;

export const ReadingSession = z.object({
  id: uuid,
  organisationId: uuid,
  learnerId: uuid,
  passageId: uuid,
  status: SessionStatus,
  idempotencyKey: nonEmptyText,
  startedAt: timestamp.nullable(),
  completedAt: timestamp.nullable(),
  createdAt: timestamp,
});
export type ReadingSession = z.infer<typeof ReadingSession>;

export const EvidenceBundle = z.object({
  sessionId: nonEmptyText,
  wordEventId: nonEmptyText,
  tokenIndex: z.number().int().nonnegative(),
  referenceWord: nonEmptyText,
  observedForm: z.string().trim().min(1).nullable(),
  eventType: EventType,
  audioConfidence: boundedConfidence,
  alignmentConfidence: boundedConfidence,
  lexicalConfidence: boundedConfidence,
  pronunciationConfidence: boundedConfidence,
  pronunciationContext: PronunciationContext,
  selfCorrectionDetected: z.boolean(),
  pauseBeforeInterventionMs: z.number().int().nonnegative(),
  evidenceRefs: z.array(nonEmptyText).min(1),
  provider: nonEmptyText,
  providerVersion: nonEmptyText,
  policyVersion: nonEmptyText,
});
export type EvidenceBundle = z.infer<typeof EvidenceBundle>;

export const FixtureEvidenceCase = EvidenceBundle.extend({
  id: nonEmptyText,
  goldAction: Action,
  speakerGroup: nonEmptyText,
});
export type FixtureEvidenceCase = z.infer<typeof FixtureEvidenceCase>;

export const FixtureEvidencePack = z.object({
  version: z.literal("gold-pack-1"),
  cases: z.array(FixtureEvidenceCase).min(1),
});
export type FixtureEvidencePack = z.infer<typeof FixtureEvidencePack>;

export const LoadFixtureInput = z.object({
  packVersion: z.literal("gold-pack-1").default("gold-pack-1"),
});
export type LoadFixtureInput = z.infer<typeof LoadFixtureInput>;

export const AgentDecision = z.object({
  action: Action,
  eventType: EventType,
  reasonCode: nonEmptyText,
  confidence: boundedConfidence,
  evidenceRefs: z.array(nonEmptyText).min(1),
  teacherNote: z.string().trim().min(1).max(1000),
  policyVersion: nonEmptyText,
  traceId: nonEmptyText,
});
export type AgentDecision = z.infer<typeof AgentDecision>;

export const HumanOverride = z.object({
  agentDecisionId: nonEmptyText,
  reviewerId: nonEmptyText,
  overrideAction: Action,
  reason: z.string().trim().min(3).max(1000),
});
export type HumanOverride = z.infer<typeof HumanOverride>;

export const AuditEvent = z.object({
  id: uuid,
  actorType: nonEmptyText,
  actorId: uuid.nullable(),
  action: nonEmptyText,
  resource: nonEmptyText,
  beforeJson: z.record(z.string(), z.unknown()).nullable(),
  afterJson: z.record(z.string(), z.unknown()).nullable(),
  traceId: nonEmptyText.nullable(),
  createdAt: timestamp,
});
export type AuditEvent = z.infer<typeof AuditEvent>;

export const S1S3ContractNames = z.enum([
  "EvidenceBundle",
  "FixtureEvidenceCase",
  "FixtureEvidencePack",
  "AgentDecision",
  "HumanOverride",
  "AuditEvent",
]);

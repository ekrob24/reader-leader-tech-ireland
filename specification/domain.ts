import { z } from "zod";

export const Action = z.enum(["PROMPT", "MODEL", "STAY_SILENT", "ESCALATE"]);
export type Action = z.infer<typeof Action>;

export const EventType = z.enum([
  "CORRECT", "SUBSTITUTION", "OMISSION", "INSERTION",
  "REPETITION", "SELF_CORRECTION", "HESITATION", "UNCERTAIN",
]);
export type EventType = z.infer<typeof EventType>;

export const PronunciationContext = z.enum(["VALID_REGIONAL_VARIANT", "NOT_MATCHED", "UNCERTAIN"]);
export type PronunciationContext = z.infer<typeof PronunciationContext>;

export const EvidenceBundle = z.object({
  sessionId: z.string().min(1),
  wordEventId: z.string().min(1),
  tokenIndex: z.number().int().nonnegative(),
  referenceWord: z.string().min(1),
  observedForm: z.string().nullable(),
  eventType: EventType,
  audioConfidence: z.number().min(0).max(1),
  alignmentConfidence: z.number().min(0).max(1),
  lexicalConfidence: z.number().min(0).max(1),
  pronunciationConfidence: z.number().min(0).max(1),
  pronunciationContext: PronunciationContext,
  selfCorrectionDetected: z.boolean(),
  pauseBeforeInterventionMs: z.number().int().nonnegative(),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  provider: z.string().min(1),
  providerVersion: z.string().min(1),
  policyVersion: z.string().min(1),
});
export type EvidenceBundle = z.infer<typeof EvidenceBundle>;

export const AgentDecision = z.object({
  action: Action,
  eventType: EventType,
  reasonCode: z.string().min(1),
  confidence: z.number().min(0).max(1),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  teacherNote: z.string().min(1).max(1000),
  policyVersion: z.string().min(1),
  traceId: z.string().min(1),
});
export type AgentDecision = z.infer<typeof AgentDecision>;

export const PolicyResult = z.object({
  accepted: z.boolean(),
  action: Action,
  reasonCode: z.string().min(1),
  violations: z.array(z.string()),
  auditEvent: z.object({
    traceId: z.string().min(1),
    policyVersion: z.string().min(1),
    originalAction: Action,
    validatedAction: Action,
  }),
});
export type PolicyResult = z.infer<typeof PolicyResult>;

export const HumanOverride = z.object({
  agentDecisionId: z.string().min(1),
  reviewerId: z.string().min(1),
  overrideAction: Action,
  reason: z.string().min(3).max(1000),
});
export type HumanOverride = z.infer<typeof HumanOverride>;

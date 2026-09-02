import { z } from "zod";

export const LearnerId = z.string().uuid();
export const DecisionId = z.string().uuid();
export const OverrideId = z.string().uuid();
export const TIMELINE_INTEGRITY_MESSAGE = "Some timeline records need attention before this view can be shown.";

export const LearnerRecord = z.object({
  id: LearnerId,
  displayName: z.string().min(1).max(120),
  safeLabel: z.string().min(1).max(120),
  organisationId: z.string().uuid(),
});
export type LearnerRecord = z.infer<typeof LearnerRecord>;

export const LearnerSelectionInput = z.object({ learnerId: LearnerId });
export type LearnerSelectionInput = z.infer<typeof LearnerSelectionInput>;



export const TimelineEntry = z.object({
  id: DecisionId,
  learnerId: LearnerId,
  action: z.enum(["PROMPT", "ENCOURAGE", "STAY_SILENT"]),
  status: z.enum(["PROPOSED", "OVERRIDDEN", "REVERSED"]),
  summary: z.string().min(1).max(240),
  createdAt: z.string().datetime(),
  overrideId: OverrideId.nullable(),
});
export type TimelineEntry = z.infer<typeof TimelineEntry>;

export const TimelinePageInput = z.object({ learnerId: LearnerId, page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(50).default(10) });
export type TimelinePageInput = z.infer<typeof TimelinePageInput>;

export const TimelinePage = z.object({ items: z.array(TimelineEntry), page: z.number().int().min(1), pageSize: z.number().int().min(1).max(50), total: z.number().int().min(0), nextPage: z.number().int().min(1).nullable() });
export type TimelinePage = z.infer<typeof TimelinePage>;

export const AuditEntry = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid(),
  learnerId: LearnerId,
  eventType: z.enum(["OVERRIDE_CREATED", "OVERRIDE_REVERSED"]),
  summary: z.string().min(1).max(240),
  createdAt: z.string().datetime(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;

export const OverrideReversalInput = z.object({
  overrideId: OverrideId,
  reason: z.string().trim().min(8).max(500),
  idempotencyKey: z.string().trim().min(8).max(120),
});
export type OverrideReversalInput = z.infer<typeof OverrideReversalInput>;

export const LearnerSafetyWorkspace = z.object({
  learner: LearnerRecord,
  timeline: z.array(TimelineEntry),
  audit: z.array(AuditEntry),
  canManage: z.boolean(),
});
export type LearnerSafetyWorkspace = z.infer<typeof LearnerSafetyWorkspace>;

export const ChildProgress = z.object({
  step: z.number().int().min(0),
  total: z.number().int().min(1),
  completed: z.boolean(),
  encouragement: z.string().min(1).max(180),
}).superRefine((value, context) => {
  if (value.step > value.total) context.addIssue({ code: "custom", path: ["step"], message: "Step cannot exceed total" });
  if (value.completed !== (value.step === value.total)) context.addIssue({ code: "custom", path: ["completed"], message: "Completion must match the final step" });
});
export type ChildProgress = z.infer<typeof ChildProgress>;

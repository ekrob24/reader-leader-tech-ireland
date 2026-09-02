import { z } from "zod";

export const ContentOrganisationId = z.string().uuid();
export const PassageId = z.string().uuid();
export const PassageApprovalStatus = z.enum(["DRAFT", "APPROVED", "RETIRED"]);
export const RightsStatus = z.enum(["UNREVIEWED", "CLEARED", "BLOCKED"]);
export const SafetyStatus = z.enum(["UNREVIEWED", "PASSED", "BLOCKED"]);
export const ContentGovernanceRole = z.enum(["school_admin", "literacy_lead", "content_steward"]);
export const TeacherSelectionRole = z.enum(["school_admin", "literacy_lead", "teacher_set", "content_steward"]);

const idempotencyKey = z.string().trim().min(8).max(120);
const shortText = z.string().trim().min(1).max(160);
const passageBody = z.string().trim().min(1).max(20_000);

export const CreatePassageDraftInput = z.object({
  organisationId: ContentOrganisationId,
  title: shortText,
  body: passageBody,
  regionTags: z.array(z.string().trim().min(2).max(20)).min(1).max(8),
  phonicsProfile: z.record(z.string().trim().min(1).max(60), z.unknown()).default({}),
  idempotencyKey,
});
export type CreatePassageDraftInput = z.infer<typeof CreatePassageDraftInput>;

export const SetPassageRightsInput = z.object({ passageId: PassageId, rightsStatus: z.enum(["CLEARED", "BLOCKED"]), idempotencyKey });
export type SetPassageRightsInput = z.infer<typeof SetPassageRightsInput>;
export const SetPassageSafetyInput = z.object({ passageId: PassageId, safetyStatus: z.enum(["PASSED", "BLOCKED"]), idempotencyKey });
export type SetPassageSafetyInput = z.infer<typeof SetPassageSafetyInput>;
export const ApprovePassageInput = z.object({ passageId: PassageId, idempotencyKey });
export type ApprovePassageInput = z.infer<typeof ApprovePassageInput>;
export const RetirePassageInput = z.object({ passageId: PassageId, idempotencyKey });
export type RetirePassageInput = z.infer<typeof RetirePassageInput>;
export const ContentOrganisationInput = z.object({ organisationId: ContentOrganisationId });

export const ContentOrganisationContext = z.object({
  id: ContentOrganisationId,
  name: z.string().trim().min(1),
  role: TeacherSelectionRole,
  canGovernContent: z.boolean(),
});
export type ContentOrganisationContext = z.infer<typeof ContentOrganisationContext>;

export const PassageWorkflowItem = z.object({
  id: PassageId,
  title: shortText,
  body: passageBody,
  version: z.number().int().positive(),
  regionTags: z.array(z.string()),
  approvalStatus: PassageApprovalStatus,
  rightsStatus: RightsStatus,
  safetyStatus: SafetyStatus,
  approvedAt: z.string().datetime().nullable(),
  canApprove: z.boolean(),
});
export type PassageWorkflowItem = z.infer<typeof PassageWorkflowItem>;

export const ContentReviewEvent = z.object({
  id: z.string().uuid(),
  passageId: PassageId,
  action: z.enum(["DRAFT_CREATED", "RIGHTS_CLEARED", "RIGHTS_BLOCKED", "SAFETY_PASSED", "SAFETY_BLOCKED", "APPROVED", "RETIRED"]),
  createdAt: z.string().datetime(),
});
export type ContentReviewEvent = z.infer<typeof ContentReviewEvent>;

export const ContentWorkflowOverview = z.object({
  organisation: ContentOrganisationContext,
  approvedPassages: z.array(PassageWorkflowItem),
  reviewQueue: z.array(PassageWorkflowItem),
  reviewHistory: z.array(ContentReviewEvent),
});
export type ContentWorkflowOverview = z.infer<typeof ContentWorkflowOverview>;

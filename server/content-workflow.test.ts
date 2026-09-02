import { describe, expect, it } from "vitest";
import { ApprovePassageInput, ContentWorkflowOverview, CreatePassageDraftInput, SetPassageRightsInput, SetPassageSafetyInput } from "@shared/content-workflow";

const organisationId = "11111111-1111-4111-8111-111111111111";
const passageId = "22222222-2222-4222-8222-222222222222";

describe("content workflow contracts", () => {
  it("accepts a bounded, retry-safe adult draft and rejects empty region context", () => {
    expect(CreatePassageDraftInput.parse({
      organisationId, title: "A calm harbour", body: "A short passage for adult review.", regionTags: ["IE"], idempotencyKey: "content-draft-0001",
    })).toMatchObject({ phonicsProfile: {}, regionTags: ["IE"] });
    expect(() => CreatePassageDraftInput.parse({
      organisationId, title: "A calm harbour", body: "A short passage for adult review.", regionTags: [], idempotencyKey: "content-draft-0002",
    })).toThrow();
  });

  it("permits only cleared rights, passed safety, and UUID-addressed approval actions", () => {
    expect(SetPassageRightsInput.parse({ passageId, rightsStatus: "CLEARED", idempotencyKey: "rights-review-0001" }).rightsStatus).toBe("CLEARED");
    expect(SetPassageSafetyInput.parse({ passageId, safetyStatus: "PASSED", idempotencyKey: "safety-review-0001" }).safetyStatus).toBe("PASSED");
    expect(() => ApprovePassageInput.parse({ passageId: "not-a-uuid", idempotencyKey: "approve-review-0001" })).toThrow();
  });

  it("requires the overview to label approval readiness without exposing a draft as teacher-selectable", () => {
    const overview = ContentWorkflowOverview.parse({
      organisation: { id: organisationId, name: "Review school", role: "content_steward", canGovernContent: true },
      approvedPassages: [],
      reviewQueue: [{ id: passageId, title: "Awaiting review", body: "Adult review text.", version: 1, regionTags: ["IE"], approvalStatus: "DRAFT", rightsStatus: "CLEARED", safetyStatus: "PASSED", approvedAt: null, canApprove: true }],
      reviewHistory: [],
    });
    expect(overview.approvedPassages).toHaveLength(0);
    expect(overview.reviewQueue[0]?.canApprove).toBe(true);
  });
});

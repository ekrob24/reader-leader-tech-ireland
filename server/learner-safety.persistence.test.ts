import { describe, expect, it } from "vitest";
import { AuditEntry, ChildProgress, LearnerRecord, LearnerSafetyWorkspace, TimelineEntry } from "@shared/learner-safety-persistence";

const learner = { id: "00000000-0000-4000-8000-000000000001", displayName: "Ava Reader", safeLabel: "Ava", organisationId: "00000000-0000-4000-8000-000000000010" };

describe("learner safety persistence contracts", () => {
  it("accepts a learner-scoped workspace with a timeline and adult-only audit", () => {
    const result = LearnerSafetyWorkspace.parse({ learner, canManage: true, timeline: [{ id: "00000000-0000-4000-8000-000000000011", learnerId: learner.id, action: "PROMPT", status: "OVERRIDDEN", summary: "A reviewed prompt.", createdAt: "2026-09-02T10:00:00.000Z", overrideId: "00000000-0000-4000-8000-000000000012" }], audit: [{ id: "00000000-0000-4000-8000-000000000013", actorId: "00000000-0000-4000-8000-000000000014", learnerId: learner.id, eventType: "OVERRIDE_CREATED", summary: "Reviewed by teacher.", createdAt: "2026-09-02T10:01:00.000Z" }] });
    expect(result.learner.safeLabel).toBe("Ava");
    expect(result.timeline[0]?.status).toBe("OVERRIDDEN");
    expect(result.audit[0]?.eventType).toBe("OVERRIDE_CREATED");
  });

  it("rejects non-UUID learner identifiers and malformed audit events", () => {
    expect(() => LearnerRecord.parse({ ...learner, id: "not-a-uuid" })).toThrow();
    expect(() => AuditEntry.parse({ id: learner.id, actorId: learner.id, learnerId: learner.id, eventType: "DELETED", summary: "bad", createdAt: "2026-09-02T10:01:00.000Z" })).toThrow();
    expect(() => TimelineEntry.parse({ id: learner.id, learnerId: learner.id, action: "MODEL", status: "PROPOSED", summary: "bad", createdAt: "2026-09-02T10:00:00.000Z", overrideId: null })).toThrow();
  });

  it("keeps child progress bounded and validates completion state data", () => {
    expect(ChildProgress.parse({ step: 2, total: 3, completed: false, encouragement: "One small step." }).step).toBe(2);
    expect(() => ChildProgress.parse({ step: 4, total: 3, completed: false, encouragement: "Too far." })).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { parseAuditRow, parseLearnerRow, parseTimelineRow } from "./reader-leader/learner-safety-persistence";

describe("Supabase row normalization", () => {
  it("maps Supabase snake_case columns into the shared learner contract", () => {
    expect(parseLearnerRow({
      id: "11111111-1111-4111-8111-111111111111",
      display_name: "Demo Learner A",
      safe_label: "Demo Learner A",
      organisation_id: "22222222-2222-4222-8222-222222222222",
    })).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      displayName: "Demo Learner A",
      safeLabel: "Demo Learner A",
      organisationId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("maps learner_id and normalizes a Postgres timestamp for timeline entries", () => {
    expect(parseTimelineRow({
      id: "33333333-3333-4333-8333-333333333333",
      learner_id: "11111111-1111-4111-8111-111111111111",
      action: "PROMPT",
      status: "PROPOSED",
      summary: "A bounded prompt is ready.",
      created_at: "2026-09-02 21:58:04+00",
      override_id: null,
    })).toMatchObject({
      learnerId: "11111111-1111-4111-8111-111111111111",
      createdAt: "2026-09-02T21:58:04.000Z",
      overrideId: null,
    });
  });

  it("normalizes Date values for audit entries and keeps the adult event shape", () => {
    expect(parseAuditRow({
      id: "44444444-4444-4444-8444-444444444444",
      actor_id: "55555555-5555-4555-8555-555555555555",
      learner_id: "11111111-1111-4111-8111-111111111111",
      event_type: "OVERRIDE_REVERSED",
      summary: "Teacher documented the reversal.",
      created_at: new Date("2026-09-02T21:58:04.000Z"),
    })).toMatchObject({
      actorId: "55555555-5555-4555-8555-555555555555",
      learnerId: "11111111-1111-4111-8111-111111111111",
      eventType: "OVERRIDE_REVERSED",
      createdAt: "2026-09-02T21:58:04.000Z",
    });
  });

  it("rejects rows missing required fields or with invalid timestamps", () => {
    expect(() => parseLearnerRow({ id: "not-a-complete-row" })).toThrow();
    expect(() => parseTimelineRow({
      id: "33333333-3333-4333-8333-333333333333",
      learner_id: undefined,
      action: "PROMPT",
      status: "PROPOSED",
      summary: "A bounded prompt is ready.",
      created_at: "not-a-timestamp",
      override_id: null,
    })).toThrow();
  });
});

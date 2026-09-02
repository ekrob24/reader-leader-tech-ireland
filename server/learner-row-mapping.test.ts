import { describe, expect, it } from "vitest";
import { parseLearnerRow } from "./reader-leader/learner-safety-persistence";

describe("parseLearnerRow", () => {
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

  it("rejects rows missing the required database fields", () => {
    expect(() => parseLearnerRow({ id: "not-a-complete-row" })).toThrow();
  });
});

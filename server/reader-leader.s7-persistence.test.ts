import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ duplicate: false }));

vi.mock("./supabase", () => ({
  getSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table === "agent_decisions") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: "11111111-1111-4111-8111-111111111111", session_id: "session-1", reading_sessions: { organisation_id: "org-1" } }, error: null }),
            }),
          }),
        };
      }
      if (table === "memberships") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: "teacher_set" }, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        insert: () => ({
          select: () => ({
            single: async () => state.duplicate
              ? { data: null, error: { code: "23505", message: "duplicate key" } }
              : { data: { id: "33333333-3333-4333-8333-333333333333", override_action: "STAY_SILENT", idempotency_key: "override-1" }, error: null },
          }),
        }),
      };
    },
  }),
}));

import { persistHumanOverride } from "./reader-leader/override-persistence";

const input = {
  agentDecisionId: "11111111-1111-4111-8111-111111111111",
  reviewerId: "22222222-2222-4222-8222-222222222222",
  overrideAction: "STAY_SILENT",
  reason: "Valid regional pronunciation",
  idempotencyKey: "override-1",
};

describe("S7 override persistence", () => {
  it("persists an authorised teacher override through the server client", async () => {
    await expect(persistHumanOverride(input, {
      role: "teacher_set",
      userId: input.reviewerId,
    })).resolves.toMatchObject({ idempotency_key: "override-1" });
  });

  it("rejects guardians before attempting a privileged write", async () => {
    await expect(persistHumanOverride(input, {
      role: "guardian",
      userId: input.reviewerId,
    })).rejects.toThrow("authorised teacher or admin");
  });

  it("rejects reviewer identity mismatches", async () => {
    await expect(persistHumanOverride(input, {
      role: "teacher_set",
      userId: "44444444-4444-4444-8444-444444444444",
    })).rejects.toThrow("does not match");
  });

  it("returns an actionable duplicate-idempotency failure", async () => {
    state.duplicate = true;
    await expect(persistHumanOverride(input, {
      role: "teacher_set",
      userId: input.reviewerId,
    })).rejects.toThrow("already been used");
    state.duplicate = false;
  });
});

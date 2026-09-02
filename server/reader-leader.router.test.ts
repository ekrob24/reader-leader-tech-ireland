import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const state = vi.hoisted(() => ({ member: true, memberOrg: "org-1" }));
const reviewerId = "22222222-2222-4222-8222-222222222222";
const decisionId = "11111111-1111-4111-8111-111111111111";

vi.mock("./supabase", () => ({
  getSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table === "memberships") {
        return {
          select: () => ({
            eq: (column: string, value: string) => column === "user_id"
              ? {
                  eq: (_orgColumn: string, orgValue: string) => ({
                    maybeSingle: async () => state.member && state.memberOrg === orgValue
                      ? { data: { user_id: reviewerId, role: "teacher_set" }, error: null }
                      : { data: null, error: null },
                  }),
                  limit: () => ({ maybeSingle: async () => ({ data: state.member ? { user_id: reviewerId, role: "teacher_set" } : null, error: null }) }),
                }
              : { maybeSingle: async () => ({ data: state.member && value === state.memberOrg ? { user_id: reviewerId, role: "teacher_set" } : null, error: null }) },
          }),
        };
      }
      if (table === "agent_decisions") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: decisionId, session_id: "session-1", reading_sessions: { organisation_id: "org-1" } }, error: null }),
            }),
          }),
        };
      }
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({ data: { id: "33333333-3333-4333-8333-333333333333" }, error: null }),
          }),
        }),
      };
    },
  }),
}));

function context(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: reviewerId,
      role: "user",
      name: "Teacher",
      email: "teacher@example.com",
      loginMethod: "test",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("S7 router authorization", () => {
  it("uses the Reader Leader membership role instead of scaffold user role", async () => {
    await expect(appRouter.createCaller(context()).readerLeader.createOverride({
      agentDecisionId: decisionId,
      reviewerId,
      overrideAction: "STAY_SILENT",
      reason: "Valid regional pronunciation",
      idempotencyKey: "router-override-1",
    })).resolves.toMatchObject({ id: "33333333-3333-4333-8333-333333333333" });
  });

  it("rejects a non-member before the privileged write", async () => {
    state.member = false;
    await expect(appRouter.createCaller(context()).readerLeader.createOverride({
      agentDecisionId: decisionId,
      reviewerId,
      overrideAction: "STAY_SILENT",
      reason: "Non-member should be rejected",
      idempotencyKey: "router-override-2",
    })).rejects.toThrow("membership");
    state.member = true;
  });

  it("rejects a member from a different organisation", async () => {
    state.memberOrg = "org-2";
    await expect(appRouter.createCaller(context()).readerLeader.createOverride({
      agentDecisionId: decisionId,
      reviewerId,
      overrideAction: "STAY_SILENT",
      reason: "Cross-tenant reviewer should be rejected",
      idempotencyKey: "router-override-cross-tenant",
    })).rejects.toThrow("membership");
    state.memberOrg = "org-1";
  });

  it("returns a persisted decision only with target-organisation membership", async () => {
    await expect(appRouter.createCaller(context()).readerLeader.persistedDecision({ decisionId })).resolves.toMatchObject({
      decision: { id: decisionId },
      organisationId: "org-1",
      reviewer: { role: "teacher_set" },
    });
    state.member = false;
    await expect(appRouter.createCaller(context()).readerLeader.persistedDecision({ decisionId })).rejects.toThrow("membership");
    state.member = true;
    state.memberOrg = "org-2";
    await expect(appRouter.createCaller(context()).readerLeader.persistedDecision({ decisionId })).rejects.toThrow("membership");
    state.memberOrg = "org-1";
  });
});

import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const calls = vi.hoisted(() => ({
  recordGuardianConsent: vi.fn(async () => ({ id: "22222222-2222-4222-8222-222222222222", learnerId: "11111111-1111-4111-8111-111111111111", guardianId: "33333333-3333-4333-8333-333333333333", purpose: "READING_ASSESSMENT", trainingOptIn: false, consentTextVersion: "guardian-copy-1", policyVersion: "retention-policy-1", retentionUntil: "2030-01-01T00:00:00.000Z", createdAt: "2026-09-02T00:00:00.000Z" })),
  withdrawGuardianConsent: vi.fn(),
  requestDataDeletion: vi.fn(),
  getRetentionEligibility: vi.fn(),
  getDeletionStatus: vi.fn(),
}));

vi.mock("./reader-leader/consent-lifecycle", () => calls);

import { appRouter } from "./routers";

function context(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "guardian-manus-actor",
      role: "user",
      name: "Guardian Example",
      email: "guardian@example.test",
      loginMethod: "test",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("consentLifecycle router", () => {
  it("accepts a safe consent payload and forces the training opt-out default", async () => {
    const result = await appRouter.createCaller(context()).consentLifecycle.recordGuardianConsent({
      learnerId: "11111111-1111-4111-8111-111111111111",
      purpose: "READING_ASSESSMENT",
      consentTextVersion: "guardian-copy-1",
      policyVersion: "retention-policy-1",
      retentionUntil: "2030-01-01T00:00:00.000Z",
      idempotencyKey: "guardian-consent-0001",
    });
    expect(result.trainingOptIn).toBe(false);
    expect(calls.recordGuardianConsent).toHaveBeenCalledWith(expect.objectContaining({ openId: "guardian-manus-actor" }), expect.objectContaining({ trainingOptIn: false }));
  });

  it("rejects malformed or expired consent and deletion-request input before it reaches persistence", async () => {
    await expect(appRouter.createCaller(context()).consentLifecycle.recordGuardianConsent({
      learnerId: "not-a-uuid",
      purpose: "READING_ASSESSMENT",
      consentTextVersion: "guardian-copy-1",
      policyVersion: "retention-policy-1",
      retentionUntil: "2020-01-01T00:00:00.000Z",
      idempotencyKey: "guardian-consent-0002",
    })).rejects.toThrow();
    await expect(appRouter.createCaller(context()).consentLifecycle.requestDataDeletion({
      learnerId: "11111111-1111-4111-8111-111111111111",
      scope: "UNSUPPORTED_SCOPE" as "AUDIO_AND_DERIVED_DATA",
      idempotencyKey: "deletion-request-0002",
    })).rejects.toThrow();
    expect(calls.requestDataDeletion).not.toHaveBeenCalled();
  });
});

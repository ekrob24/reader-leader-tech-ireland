import { describe, expect, it } from "vitest";
import { RecordGuardianConsentInput, RequestDataDeletionInput, WithdrawGuardianConsentInput } from "@shared/consent-lifecycle";
import { deriveRetentionEligibility } from "./reader-leader/consent-lifecycle";

const learnerId = "11111111-1111-4111-8111-111111111111";
const consentId = "22222222-2222-4222-8222-222222222222";

describe("consent lifecycle contracts", () => {
  it("records only future, assessment-specific, training-opt-out guardian consent", () => {
    const futureRetention = "2030-09-02T00:00:00.000Z";
    expect(RecordGuardianConsentInput.parse({
      learnerId,
      purpose: "READING_ASSESSMENT",
      consentTextVersion: "guardian-copy-1.0",
      policyVersion: "retention-policy-1.0",
      retentionUntil: futureRetention,
      idempotencyKey: "consent-record-0001",
    })).toMatchObject({ trainingOptIn: false, retentionUntil: futureRetention });
    expect(() => RecordGuardianConsentInput.parse({
      learnerId,
      purpose: "READING_ASSESSMENT",
      consentTextVersion: "guardian-copy-1.0",
      policyVersion: "retention-policy-1.0",
      retentionUntil: "2020-09-02T00:00:00.000Z",
      idempotencyKey: "consent-record-0002",
    })).toThrow("Retention must end in the future");
  });

  it("accepts only explicit withdrawal reasons and an audio-plus-derived-data deletion scope", () => {
    expect(WithdrawGuardianConsentInput.parse({ consentId, reason: "WITHDRAWAL_OF_CONSENT", idempotencyKey: "withdrawal-record-0001" }).reason).toBe("WITHDRAWAL_OF_CONSENT");
    expect(() => WithdrawGuardianConsentInput.parse({ consentId, reason: "UNSPECIFIED", idempotencyKey: "withdrawal-record-0002" })).toThrow();
    expect(RequestDataDeletionInput.parse({ learnerId, idempotencyKey: "deletion-request-0001" }).scope).toBe("AUDIO_AND_DERIVED_DATA");
  });

  it("blocks processing when consent is withdrawn, expired, missing, or pending deletion", () => {
    const now = new Date("2026-09-02T12:00:00.000Z");
    const active = deriveRetentionEligibility(learnerId, { learner_id: learnerId, purpose: "READING_ASSESSMENT", status: "ACTIVE", retention_until: "2026-09-03T12:00:00.000Z" }, now);
    const withdrawn = deriveRetentionEligibility(learnerId, { learner_id: learnerId, purpose: "READING_ASSESSMENT", status: "WITHDRAWN", retention_until: "2026-09-03T12:00:00.000Z" }, now);
    const expired = deriveRetentionEligibility(learnerId, { learner_id: learnerId, purpose: "READING_ASSESSMENT", status: "ACTIVE", retention_until: "2026-09-01T12:00:00.000Z" }, now);
    const pending = deriveRetentionEligibility(learnerId, { learner_id: learnerId, purpose: "READING_ASSESSMENT", status: "PENDING_DELETION", retention_until: "2026-09-03T12:00:00.000Z" }, now);

    expect(active).toMatchObject({ status: "ACTIVE", mayProcessData: true });
    expect(withdrawn).toMatchObject({ status: "WITHDRAWN", mayProcessData: false });
    expect(expired).toMatchObject({ status: "EXPIRED", mayProcessData: false });
    expect(pending).toMatchObject({ status: "PENDING_DELETION", mayProcessData: false });
  });
});

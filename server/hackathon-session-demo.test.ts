import { describe, expect, it } from "vitest";
import { createPrivacySafeTraceSummary, CreateHackathonSessionInput, HackathonSessionRecord, RecordMockUploadInput, ResetHackathonDemoInput, TeacherSessionHistory } from "@shared/hackathon-session-demo";
import { hasActiveAssessmentConsent } from "./reader-leader/hackathon-session-demo";

const learnerId = "11111111-1111-4111-8111-111111111111";
const passageId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";
const now = Date.parse("2026-09-03T12:00:00.000Z");

describe("hackathon session demo contracts", () => {
  it("requires bounded UUID-addressed session and mock-upload metadata without accepting bytes", () => {
    expect(CreateHackathonSessionInput.parse({ learnerId, passageId, idempotencyKey: "demo-session-0001" })).toMatchObject({ learnerId, passageId });
    expect(RecordMockUploadInput.parse({ sessionId, fileName: "synthetic-sample.webm", mediaType: "audio/webm", byteSize: 2048, idempotencyKey: "demo-upload-0001" })).not.toHaveProperty("bytes");
    expect(() => RecordMockUploadInput.parse({ sessionId, fileName: "../unsafe.webm", mediaType: "audio/webm", byteSize: 1, idempotencyKey: "demo-upload-0002" })).toThrow();
  });

  it("allows mock processing only for active, unexpired guardian consent", () => {
    expect(hasActiveAssessmentConsent({ status: "ACTIVE", retention_until: "2026-09-04T12:00:00.000Z" }, now)).toBe(true);
    expect(hasActiveAssessmentConsent({ status: "WITHDRAWN", retention_until: "2026-09-04T12:00:00.000Z" }, now)).toBe(false);
    expect(hasActiveAssessmentConsent({ status: "ACTIVE", retention_until: "2026-09-02T12:00:00.000Z" }, now)).toBe(false);
  });

  it("requires traces to remain privacy-safe summaries tied to the durable session and job", () => {
    const session = HackathonSessionRecord.parse({
      id: sessionId, learnerId, passageId, organisationId: "44444444-4444-4444-8444-444444444444", sessionStatus: "ANALYSING", uploadStatus: "UPLOADED", consentStatus: "ACTIVE", mayProcessData: true,
      job: { id: "55555555-5555-4555-8555-555555555555", status: "QUEUED", attemptCount: 0, traceId: "66666666-6666-4666-8666-666666666666" },
      traces: [{ id: "77777777-7777-4777-8777-777777777777", traceId: "66666666-6666-4666-8666-666666666666", sessionId, stage: "ANALYSIS_QUEUED", safeSummary: "Deterministic mock analysis was queued for adult review.", createdAt: "2026-09-03T12:00:00.000Z" }],
    });
    expect(session.traces[0]?.safeSummary).toContain("adult review");
  });

  it("exports only a privacy-safe synthetic trace summary", () => {
    const session = HackathonSessionRecord.parse({
      id: sessionId, learnerId, passageId, organisationId: "44444444-4444-4444-8444-444444444444", sessionStatus: "READY", uploadStatus: "UPLOADED", consentStatus: "ACTIVE", mayProcessData: true,
      job: { id: "55555555-5555-4555-8555-555555555555", status: "READY", attemptCount: 0, traceId: "66666666-6666-4666-8666-666666666666" },
      traces: [{ id: "77777777-7777-4777-8777-777777777777", traceId: "66666666-6666-4666-8666-666666666666", sessionId, stage: "ANALYSIS_READY", safeSummary: "Mock analysis is ready for adult review.", createdAt: "2026-09-03T12:00:00.000Z" }],
    });
    const exported = createPrivacySafeTraceSummary(session, "2026-09-03T12:30:00.000Z");
    expect(exported).toMatchObject({ classification: "SYNTHETIC_HACKATHON_DEMO_ONLY", consentGate: "ACTIVE", completedStages: ["ANALYSIS_READY"] });
    expect(JSON.stringify(exported)).not.toContain(learnerId);
    expect(JSON.stringify(exported)).not.toContain(passageId);
  });

  it("requires an explicit synthetic-only confirmation before a reset operation", () => {
    expect(ResetHackathonDemoInput.parse({ organisationId: "44444444-4444-4444-8444-444444444444", confirmation: "RESET_SYNTHETIC_SESSIONS" })).toBeTruthy();
    expect(() => ResetHackathonDemoInput.parse({ organisationId: "44444444-4444-4444-8444-444444444444", confirmation: "RESET" })).toThrow();
  });

  it("keeps teacher session history to safe labels, passage titles, and workflow status rather than child links", () => {
    const history = TeacherSessionHistory.parse({ organisationId: "44444444-4444-4444-8444-444444444444", items: [{ id: sessionId, learnerLabel: "Ava", passageTitle: "A safe passage", sessionStatus: "CREATED", completionStatus: "READY_TO_START", reviewStatus: "NOT_READY", createdAt: "2026-09-03T12:00:00.000Z", completedAt: null }] });
    expect(history.items[0]).not.toHaveProperty("childPath");
    expect(history.items[0]).not.toHaveProperty("token");
    expect(history.items[0]?.reviewStatus).toBe("NOT_READY");
  });
});

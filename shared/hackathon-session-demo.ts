import { z } from "zod";

export const DemoId = z.string().uuid();
export const MockUploadStatus = z.enum(["NOT_STARTED", "UPLOADED", "BLOCKED"]);
export const MockAnalysisJobStatus = z.enum(["QUEUED", "RUNNING", "READY", "FAILED", "RETRYING", "BLOCKED"]);
export const MockTraceStage = z.enum(["SESSION_CONSENT_CHECKED", "MOCK_UPLOAD_RECORDED", "ANALYSIS_QUEUED", "ANALYSIS_STARTED", "EVIDENCE_COMPOSED", "POLICY_GATE_PASSED", "ANALYSIS_READY", "ANALYSIS_RETRYING", "ANALYSIS_BLOCKED"]);

const idempotencyKey = z.string().trim().min(8).max(120);

export const CreateHackathonSessionInput = z.object({
  learnerId: DemoId,
  passageId: DemoId,
  idempotencyKey,
});
export type CreateHackathonSessionInput = z.infer<typeof CreateHackathonSessionInput>;

export const RecordMockUploadInput = z.object({
  sessionId: DemoId,
  fileName: z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9._-]+$/, "Use a safe filename without path separators"),
  mediaType: z.enum(["audio/webm", "audio/wav"]),
  byteSize: z.number().int().min(1).max(25 * 1024 * 1024),
  idempotencyKey,
});
export type RecordMockUploadInput = z.infer<typeof RecordMockUploadInput>;

export const RunMockAnalysisInput = z.object({ sessionId: DemoId, idempotencyKey });
export type RunMockAnalysisInput = z.infer<typeof RunMockAnalysisInput>;
export const RetryMockAnalysisInput = z.object({ jobId: DemoId, idempotencyKey });
export type RetryMockAnalysisInput = z.infer<typeof RetryMockAnalysisInput>;
export const HackathonSessionIdInput = z.object({ sessionId: DemoId });

export const MockTraceEvent = z.object({
  id: DemoId,
  traceId: DemoId,
  sessionId: DemoId,
  stage: MockTraceStage,
  safeSummary: z.string().trim().min(1).max(280),
  createdAt: z.string().datetime(),
});
export type MockTraceEvent = z.infer<typeof MockTraceEvent>;

export const HackathonSessionRecord = z.object({
  id: DemoId,
  learnerId: DemoId,
  passageId: DemoId,
  organisationId: DemoId,
  sessionStatus: z.enum(["CREATED", "UPLOADING", "ANALYSING", "READY", "BLOCKED", "FAILED"]),
  uploadStatus: MockUploadStatus,
  consentStatus: z.enum(["ACTIVE", "WITHDRAWN", "EXPIRED", "PENDING_DELETION", "DELETED"]),
  mayProcessData: z.boolean(),
  job: z.object({ id: DemoId, status: MockAnalysisJobStatus, attemptCount: z.number().int().nonnegative(), traceId: DemoId }).nullable(),
  traces: z.array(MockTraceEvent),
});
export type HackathonSessionRecord = z.infer<typeof HackathonSessionRecord>;

export const HackathonDemoSummary = z.object({
  organisationId: DemoId,
  sessions: z.array(HackathonSessionRecord),
  activeConsentCount: z.number().int().nonnegative(),
  blockedSessionCount: z.number().int().nonnegative(),
  queuedOrRunningJobCount: z.number().int().nonnegative(),
});
export type HackathonDemoSummary = z.infer<typeof HackathonDemoSummary>;

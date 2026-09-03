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
export const ResetHackathonDemoInput = z.object({
  organisationId: DemoId,
  confirmation: z.literal("RESET_SYNTHETIC_SESSIONS"),
});
export type ResetHackathonDemoInput = z.infer<typeof ResetHackathonDemoInput>;
export const ResetHackathonDemoResult = z.object({ deletedSessions: z.number().int().nonnegative() });
export type ResetHackathonDemoResult = z.infer<typeof ResetHackathonDemoResult>;

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
  sessionStatus: z.enum(["CREATED", "UPLOADING", "ANALYSING", "READY", "BLOCKED", "FAILED", "CHILD_READING", "COMPLETED"]),
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

export const TeacherSessionHistoryInput = z.object({
  organisationId: DemoId,
  limit: z.number().int().min(1).max(25).default(12),
});
export type TeacherSessionHistoryInput = z.infer<typeof TeacherSessionHistoryInput>;
export const AcknowledgeTeacherSessionAlertInput = z.object({ sessionId: DemoId, idempotencyKey });
export type AcknowledgeTeacherSessionAlertInput = z.infer<typeof AcknowledgeTeacherSessionAlertInput>;
export const TeacherSessionAlertAcknowledgement = z.object({ sessionId: DemoId, acknowledgedAt: z.string().datetime() });
export type TeacherSessionAlertAcknowledgement = z.infer<typeof TeacherSessionAlertAcknowledgement>;
export const TeacherSessionHistoryItem = z.object({
  id: DemoId,
  learnerLabel: z.string().trim().min(1).max(80),
  passageTitle: z.string().trim().min(1).max(160),
  sessionStatus: HackathonSessionRecord.shape.sessionStatus,
  completionStatus: z.enum(["READY_TO_START", "READING", "COMPLETED"]),
  reviewStatus: z.enum(["NOT_READY", "READY_FOR_REVIEW"]),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  acknowledgedAt: z.string().datetime().nullable().default(null),
});
export type TeacherSessionHistoryItem = z.infer<typeof TeacherSessionHistoryItem>;
export const TeacherSessionHistory = z.object({ organisationId: DemoId, items: z.array(TeacherSessionHistoryItem) });
export type TeacherSessionHistory = z.infer<typeof TeacherSessionHistory>;

export const PrivacySafeTraceSummary = z.object({
  reportTitle: z.literal("Reader Leader — Mock analysis safety trace"),
  classification: z.literal("SYNTHETIC_HACKATHON_DEMO_ONLY"),
  generatedAt: z.string().datetime(),
  consentGate: z.enum(["ACTIVE", "BLOCKED"]),
  sessionStatus: HackathonSessionRecord.shape.sessionStatus,
  jobStatus: MockAnalysisJobStatus.nullable(),
  completedStages: z.array(MockTraceStage),
  traceEntries: z.array(z.object({ stage: MockTraceStage, safeSummary: z.string().trim().min(1).max(280) })),
});
export type PrivacySafeTraceSummary = z.infer<typeof PrivacySafeTraceSummary>;

export function createPrivacySafeTraceSummary(session: HackathonSessionRecord, generatedAt = new Date().toISOString()): PrivacySafeTraceSummary {
  return PrivacySafeTraceSummary.parse({
    reportTitle: "Reader Leader — Mock analysis safety trace",
    classification: "SYNTHETIC_HACKATHON_DEMO_ONLY",
    generatedAt,
    consentGate: session.mayProcessData ? "ACTIVE" : "BLOCKED",
    sessionStatus: session.sessionStatus,
    jobStatus: session.job?.status ?? null,
    completedStages: session.traces.map(trace => trace.stage),
    traceEntries: session.traces.map(trace => ({ stage: trace.stage, safeSummary: trace.safeSummary })),
  });
}

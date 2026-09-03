import { z } from "zod";

export const ChildSessionToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Invalid child session link");
export const JourneyId = z.string().uuid();
const idempotencyKey = z.string().trim().min(8).max(120);

export const LaunchChildSessionInput = z.object({ sessionId: JourneyId });
export const ChildSessionTokenInput = z.object({ token: ChildSessionToken });
export const ChildSessionActionInput = z.object({ token: ChildSessionToken, idempotencyKey });
export const TeacherSessionReviewInput = z.object({ sessionId: JourneyId });
export type LaunchChildSessionInput = z.infer<typeof LaunchChildSessionInput>;
export type ChildSessionTokenInput = z.infer<typeof ChildSessionTokenInput>;
export type ChildSessionActionInput = z.infer<typeof ChildSessionActionInput>;
export type TeacherSessionReviewInput = z.infer<typeof TeacherSessionReviewInput>;

export const ChildReadingState = z.enum(["READY_TO_START", "READING", "COMPLETED"]);
export const ChildReadingView = z.object({
  state: ChildReadingState,
  passage: z.object({ title: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(20_000) }),
  helpRequested: z.boolean(),
  mockOnly: z.literal(true),
  childMessage: z.string().trim().min(1).max(240),
});
export type ChildReadingView = z.infer<typeof ChildReadingView>;

export const ChildSessionLaunch = z.object({
  childPath: z.string().regex(/^\/read\/[A-Za-z0-9_-]{43}$/),
  expiresAt: z.string().datetime(),
  mockOnly: z.literal(true),
});
export type ChildSessionLaunch = z.infer<typeof ChildSessionLaunch>;

export const MockWordEvent = z.object({
  id: JourneyId,
  tokenIndex: z.number().int().nonnegative(),
  referenceWord: z.string().trim().min(1).max(80),
  eventType: z.enum(["SUBSTITUTION", "SELF_CORRECTION", "HESITATION"]),
  suggestedAction: z.enum(["PROMPT", "MODEL", "STAY_SILENT", "ESCALATE"]),
  teacherNote: z.string().trim().min(1).max(280),
});
export type MockWordEvent = z.infer<typeof MockWordEvent>;

export const TeacherMockReview = z.object({
  sessionId: JourneyId,
  sessionStatus: z.enum(["CREATED", "CHILD_READING", "COMPLETED", "READY"]),
  passageTitle: z.string().trim().min(1).max(160),
  mockOnly: z.literal(true),
  awaitingChild: z.boolean(),
  wordEvents: z.array(MockWordEvent),
});
export type TeacherMockReview = z.infer<typeof TeacherMockReview>;

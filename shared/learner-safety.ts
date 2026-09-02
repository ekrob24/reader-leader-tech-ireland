import { z } from "zod";

export const LearnerSafetyRole = z.enum(["teacher", "viewer"]);
export type LearnerSafetyRole = z.infer<typeof LearnerSafetyRole>;

export const LearnerSafetyOverview = z.object({
  role: LearnerSafetyRole,
  canManageSafety: z.boolean(),
  teacherControls: z.object({
    canReviewEvidence: z.boolean(),
    canAppendOverride: z.boolean(),
    canViewDiagnosticDetail: z.boolean(),
  }),
  childSafeView: z.object({
    title: z.string().min(1).max(120),
    message: z.string().max(240),
    template: z.enum(["PROMPT", "ENCOURAGE", "STAY_SILENT"]),
    safetyNote: z.string().min(1).max(240),
  }),
});
export type LearnerSafetyOverview = z.infer<typeof LearnerSafetyOverview>;

export function buildLearnerSafetyOverview(role: "admin" | "user"): LearnerSafetyOverview {
  const isTeacher = role === "admin";
  return LearnerSafetyOverview.parse({
    role: isTeacher ? "teacher" : "viewer",
    canManageSafety: isTeacher,
    teacherControls: {
      canReviewEvidence: isTeacher,
      canAppendOverride: isTeacher,
      canViewDiagnosticDetail: isTeacher,
    },
    childSafeView: {
      title: "A calm next step",
      message: "Let’s try that word together.",
      template: "PROMPT",
      safetyNote: "Only approved, encouraging language is shown here. Adult diagnostics stay private.",
    },
  });
}

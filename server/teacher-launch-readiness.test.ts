import { describe, expect, it } from "vitest";
import { TeacherLaunchReadinessInput } from "@shared/consent-lifecycle";
import { hasTeacherLaunchRole } from "./reader-leader/consent-lifecycle";

describe("teacher session launch readiness", () => {
  it("accepts only a learner identifier for the minimal readiness check", () => {
    expect(TeacherLaunchReadinessInput.parse({ learnerId: "00000000-0000-4000-8000-000000000001" })).toEqual({ learnerId: "00000000-0000-4000-8000-000000000001" });
  });

  it("allows staff launch roles but excludes guardian access from the teacher readiness boundary", () => {
    expect(hasTeacherLaunchRole("teacher_set")).toBe(true);
    expect(hasTeacherLaunchRole("literacy_lead")).toBe(true);
    expect(hasTeacherLaunchRole("guardian")).toBe(false);
  });
});

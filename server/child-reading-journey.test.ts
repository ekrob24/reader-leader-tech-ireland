import { describe, expect, it } from "vitest";
import { ChildReadingView, ChildSessionActionInput, ChildSessionLaunch, ChildSessionToken, MockWordEvent, TeacherMockReview } from "@shared/child-reading-journey";

const token = "b".repeat(43);
const sessionId = "00000000-0000-4000-8000-000000000051";

describe("synthetic child reading journey contracts", () => {
  it("accepts only opaque base64url child-session links and bounded child actions", () => {
    expect(ChildSessionToken.parse(token)).toBe(token);
    expect(() => ChildSessionToken.parse("teacher-session-id")).toThrow();
    expect(ChildSessionActionInput.parse({ token, idempotencyKey: "child-action-0001" }).token).toBe(token);
  });

  it("keeps child reading data to approved passage copy and safe state only", () => {
    const view = ChildReadingView.parse({ state: "READING", passage: { title: "A passage", body: "A short approved passage." }, helpRequested: false, mockOnly: true, childMessage: "Read at your own pace." });
    expect(view).not.toHaveProperty("learnerId");
    expect(view).not.toHaveProperty("wordEvents");
    expect(view.mockOnly).toBe(true);
  });

  it("requires a synthetic label on teacher mock review and a safe launch path", () => {
    expect(ChildSessionLaunch.parse({ childPath: `/read/${token}`, expiresAt: "2026-09-03T12:00:00.000Z", mockOnly: true }).mockOnly).toBe(true);
    const event = MockWordEvent.parse({ id: "00000000-0000-4000-8000-000000000052", tokenIndex: 2, referenceWord: "through", eventType: "SUBSTITUTION", suggestedAction: "PROMPT", teacherNote: "Synthetic adult review note." });
    const review = TeacherMockReview.parse({ sessionId, sessionStatus: "COMPLETED", passageTitle: "A passage", mockOnly: true, awaitingChild: false, wordEvents: [event] });
    expect(review.wordEvents).toHaveLength(1);
  });
});

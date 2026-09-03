import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildSafeTeacherReviewPdf } from "./teacherReviewPdf";

describe("safe teacher review PDF", () => {
  it("creates a synthetic, identifier-minimised PDF summary", async () => {
    const bytes = await buildSafeTeacherReviewPdf({
      sessionId: "00000000-0000-4000-8000-000000000031",
      sessionStatus: "READY",
      passageTitle: "The gentle harbour",
      mockOnly: true,
      awaitingChild: false,
      wordEvents: [{ id: "00000000-0000-4000-8000-000000000041", tokenIndex: 2, referenceWord: "through", eventType: "SUBSTITUTION", suggestedAction: "PROMPT", teacherNote: "Synthetic substitution for adult review." }],
    });
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });
});

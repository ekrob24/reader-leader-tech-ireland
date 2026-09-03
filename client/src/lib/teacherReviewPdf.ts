import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { TeacherMockReview } from "@shared/child-reading-journey";

const SAFE_CLASSIFICATION = "SYNTHETIC HACKATHON DEMO ONLY";

export async function buildSafeTeacherReviewPdf(data: TeacherMockReview): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Reader Leader — Teacher review summary");
  pdf.setAuthor("Reader Leader");
  pdf.setSubject("Synthetic adult review summary");
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.10, 0.20, 0.22);
  const muted = rgb(0.30, 0.40, 0.37);
  let y = 790;
  const write = (text: string, size = 11, emphasis = false, colour = green) => {
    const lines = regular.widthOfTextAtSize(text, size) > 500 ? text.match(/.{1,90}(\s|$)/g) ?? [text] : [text];
    for (const line of lines) { page.drawText(line.trim(), { x: 48, y, size, font: emphasis ? bold : regular, color: colour }); y -= size + 7; }
  };
  write("READER LEADER", 10, true, muted);
  write("Teacher review summary", 22, true);
  write(SAFE_CLASSIFICATION, 9, true, rgb(0.45, 0.37, 0.12));
  y -= 10;
  write(`Passage: ${data.passageTitle}`, 12, true);
  write("This summary contains deterministic mock events for a demonstration. It is not a speech-analysis result and does not diagnose a learner.", 10, false, muted);
  y -= 12;
  write("Mock events for adult review", 14, true);
  data.wordEvents.forEach((event, index) => {
    write(`${index + 1}. ${event.referenceWord} — ${event.eventType.replaceAll("_", " ")}`, 11, true);
    write(`Suggested adult action: ${event.suggestedAction.replaceAll("_", " ")}`, 10, false, muted);
    write(event.teacherNote, 10, false, muted);
    y -= 6;
  });
  y -= 8;
  write("Teacher judgement remains the final decision. No learner name, session ID, child link, audio reference, transcript, or storage metadata is included.", 10, false, muted);
  return pdf.save();
}

export async function downloadSafeTeacherReviewPdf(data: TeacherMockReview) {
  const bytes = await buildSafeTeacherReviewPdf(data);
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "reader-leader-synthetic-teacher-review.pdf";
  link.click();
  URL.revokeObjectURL(url);
}

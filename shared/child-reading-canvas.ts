export function splitApprovedPassageIntoReadingParts(body: string): string[] {
  const parts = body.split(/(?<=[.!?])\s+/).map(part => part.trim()).filter(Boolean);
  return parts.length ? parts : body.trim() ? [body.trim()] : [];
}

export function getChildReadingProgress(partCount: number, requestedIndex: number) {
  const total = Math.max(partCount, 1);
  const index = Math.max(0, Math.min(requestedIndex, total - 1));
  return { index, currentPart: index + 1, totalParts: total, percentage: ((index + 1) / total) * 100 };
}

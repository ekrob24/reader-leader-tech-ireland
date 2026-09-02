import { describe, expect, it, vi } from "vitest";
import { ReaderLeaderContractBoundaryError } from "./reader-leader/contract-boundary";
import { parseTimelineRow } from "./reader-leader/learner-safety-persistence";

describe("Reader Leader contract-boundary handling", () => {
  it("logs schema-only metadata when a malformed timeline record is rejected", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const sensitiveSummary = "Learner private reading detail must not appear in logs.";
    const sensitiveId = "11111111-1111-4111-8111-111111111111";

    expect(() => parseTimelineRow({
      id: "22222222-2222-4222-8222-222222222222",
      learner_id: sensitiveId,
      action: "PROMPT",
      status: "PROPOSED",
      summary: sensitiveSummary,
      created_at: "not-a-timestamp",
      override_id: null,
    })).toThrow(new ReaderLeaderContractBoundaryError("TIMELINE_RECORD_INVALID", "timeline_row"));

    expect(warn).toHaveBeenCalledTimes(1);
    const [prefix, payload] = warn.mock.calls[0] ?? [];
    expect(prefix).toBe("[ReaderLeader][contract-boundary]");
    expect(payload).toContain("reader_leader.contract_boundary_failure");
    expect(payload).toContain("timeline_row");
    expect(payload).not.toContain(sensitiveSummary);
    expect(payload).not.toContain(sensitiveId);
    warn.mockRestore();
  });
});

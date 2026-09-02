import { z } from "zod";

export type ContractBoundarySource = "learner_row" | "timeline_row" | "audit_row";

export class ReaderLeaderContractBoundaryError extends Error {
  constructor(
    public readonly publicCode: "LEARNER_RECORD_INVALID" | "TIMELINE_RECORD_INVALID" | "AUDIT_RECORD_INVALID",
    public readonly source: ContractBoundarySource,
  ) {
    super(`Reader Leader ${source} failed contract validation`);
    this.name = "ReaderLeaderContractBoundaryError";
  }
}

/**
 * Emits only schema-level diagnostics. It deliberately excludes IDs, row values,
 * names, free text, access tokens, and database errors so logs cannot expose
 * learner or staff data.
 */
export function logContractBoundaryFailure(
  source: ContractBoundarySource,
  error: unknown,
): void {
  const issues = error instanceof z.ZodError
    ? error.issues.map(issue => ({ code: issue.code, path: issue.path.map(String).join(".") || "root" }))
    : [{ code: "INVALID_TIMESTAMP_OR_TYPE", path: "createdAt" }];

  console.warn("[ReaderLeader][contract-boundary]", JSON.stringify({
    event: "reader_leader.contract_boundary_failure",
    source,
    issueCount: issues.length,
    issues,
  }));
}

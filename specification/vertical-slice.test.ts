import { describe, expect, it } from "vitest";
import cases from "../fixtures/gold-pack/cases.json" with { type: "json" };
import { Action, AgentDecision, EvidenceBundle } from "../src/contracts/domain.js";
import { deterministicFallback, runJudgementAgent } from "../src/agents/judgement-agent.js";
import { validateDecision } from "../src/policy/policy-gate.js";
import { evaluate } from "../src/evaluation/metrics.js";

const evidence = EvidenceBundle.parse(cases[0]);

function proposal(overrides: Record<string, unknown> = {}) {
  return { action: "PROMPT", eventType: "SUBSTITUTION", reasonCode: "CLEAR_SUBSTITUTION", confidence: 0.95, evidenceRefs: evidence.evidenceRefs, teacherNote: "Evidence indicates a clear substitution.", policyVersion: evidence.policyVersion, traceId: "trace-test", ...overrides };
}

describe("contracts", () => {
  it("accepts a valid evidence bundle", () => expect(EvidenceBundle.safeParse(evidence).success).toBe(true));
  it("rejects an unknown action", () => expect(AgentDecision.safeParse(proposal({ action: "CORRECT" })).success).toBe(false));
});

describe("policy gate", () => {
  it("accepts a high-confidence true substitution", () => {
    const result = validateDecision(proposal(), evidence);
    expect(result.accepted).toBe(true);
    expect(result.action).toBe("PROMPT");
  });
  it("forces a regional variant to silence", () => {
    const regional = EvidenceBundle.parse(cases[1]);
    const result = validateDecision(proposal({ eventType: "CORRECT", action: "PROMPT", evidenceRefs: regional.evidenceRefs, policyVersion: regional.policyVersion }), regional);
    expect(result.accepted).toBe(false);
    expect(result.action).toBe("STAY_SILENT");
    expect(result.violations).toContain("REGIONAL_VARIANT_MUST_STAY_SILENT");
  });
  it("protects self-correction and patience", () => {
    const self = EvidenceBundle.parse(cases[2]);
    const result = validateDecision(proposal({ eventType: "SELF_CORRECTION", evidenceRefs: self.evidenceRefs, policyVersion: self.policyVersion }), self);
    expect(result.action).toBe("STAY_SILENT");
    expect(result.violations).toContain("SELF_CORRECTION_PROTECTION");
  });
  it("escalates very weak evidence", () => {
    const weak = EvidenceBundle.parse(cases[3]);
    const result = validateDecision(proposal({ action: "PROMPT", eventType: "UNCERTAIN", confidence: 0.9, evidenceRefs: weak.evidenceRefs, policyVersion: weak.policyVersion }), weak);
    expect(result.action).toBe("ESCALATE");
  });
  it("fails closed for malformed model output", () => {
    const result = validateDecision({ action: "PROMPT" }, evidence);
    expect(result.accepted).toBe(false);
    expect(result.action).toBe("STAY_SILENT");
    expect(result.reasonCode).toBe("INVALID_AGENT_OUTPUT");
  });
});

describe("judgement agent", () => {
  it("uses structured model output and pins trace/policy metadata", async () => {
    const result = await runJudgementAgent({
      sessionId: evidence.sessionId,
      wordEventId: evidence.wordEventId,
      traceId: "trace-runner",
      tools: { getEvidence: async () => evidence },
      modelRunner: async input => ({ action: "PROMPT", eventType: input.evidence.eventType, reasonCode: "CLEAR_SUBSTITUTION", confidence: 0.9, evidenceRefs: input.evidence.evidenceRefs, teacherNote: "Review the substitution.", policyVersion: "ignored", traceId: "ignored" }),
    });
    expect(result.traceId).toBe("trace-runner");
    expect(result.policyVersion).toBe(evidence.policyVersion);
  });
  it("provides a safe model-unavailable fallback", () => expect(deterministicFallback(evidence, "trace-fallback").action).toBe("STAY_SILENT"));
});

describe("gold pack evaluation", () => {
  it("reports false correction separately from abstention", () => {
    const report = evaluate(cases.map(c => ({ goldAction: Action.parse(c.goldAction), predictedAction: Action.parse(c.goldAction), selfCorrectionDetected: c.selfCorrectionDetected, predictedInterrupted: false, speakerGroup: c.speakerGroup })));
    expect(report.falseCorrectionRate).toBe(0);
    expect(report.abstentionRate).toBeGreaterThan(0);
    expect(report.selfCorrectionCaptureRate).toBe(1);
  });
});

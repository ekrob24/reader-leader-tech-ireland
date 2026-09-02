import { describe, expect, it } from "vitest";
import cases from "../specification/cases.json" with { type: "json" };
import { AgentDecision, AppendOnlyOverride, EvaluationCase, EvaluationReport } from "@shared/contracts/reader-leader";
import { evaluateGoldPack, applyRegressionGate } from "./reader-leader/evaluation";
import { appendHumanOverride, createTeacherBriefing, projectChildSafeFeedback } from "./reader-leader/surfaces";

const evidence = cases[0];
const decision = AgentDecision.parse({
  action: "PROMPT",
  eventType: evidence.eventType,
  reasonCode: "CLEAR_SUBSTITUTION",
  confidence: 0.94,
  evidenceRefs: evidence.evidenceRefs,
  teacherNote: "Review the substitution with the original evidence.",
  policyVersion: evidence.policyVersion,
  traceId: "trace-s7",
});

describe("S7 safe surfaces", () => {
  it("projects only approved child-safe templates", () => {
    expect(projectChildSafeFeedback(decision)).toEqual({
      template: "ENCOURAGE_RETRY",
      message: "Try that word once more.",
      speak: true,
    });
    const silent = projectChildSafeFeedback({ ...decision, action: "STAY_SILENT" });
    expect(silent.speak).toBe(false);
    expect(silent.message).toBe("");
  });

  it("creates a teacher briefing with evidence references and no child-facing diagnosis", () => {
    const briefing = createTeacherBriefing(evidence, decision);
    expect(briefing.action).toBe("PROMPT");
    expect(briefing.evidenceRefs).toEqual(expect.arrayContaining(evidence.evidenceRefs));
    expect(briefing.summary).not.toMatch(/diagnos|deficit|disorder/i);
  });

  it("creates an append-only override with a new immutable id", () => {
    const override = appendHumanOverride({
      agentDecisionId: "11111111-1111-4111-8111-111111111111",
      reviewerId: "22222222-2222-4222-8222-222222222222",
      overrideAction: "STAY_SILENT",
      reason: "Valid regional pronunciation",
      idempotencyKey: "override-trace-s7",
    });
    expect(AppendOnlyOverride.safeParse(override).success).toBe(true);
    expect(override.id).not.toBe(override.agentDecisionId);
  });
});

describe("S8 gold-pack regression gates", () => {
  const replayCases = cases.map(item => EvaluationCase.parse({
    id: item.id,
    goldAction: item.goldAction,
    predictedAction: item.goldAction,
    selfCorrectionDetected: item.selfCorrectionDetected,
    predictedInterrupted: false,
    speakerGroup: item.speakerGroup,
    overridden: false,
  }));

  it("reports safety metrics separately and by speaker group", () => {
    const report = evaluateGoldPack(replayCases);
    expect(EvaluationReport.safeParse(report).success).toBe(true);
    expect(report.total).toBe(cases.length);
    expect(report.falseCorrectionRate).toBe(0);
    expect(report.abstentionRate).toBeGreaterThan(0);
    expect(Object.keys(report.bySpeakerGroup).length).toBeGreaterThan(0);
  });

  it("passes a clean replay and fails a false-correction regression", () => {
    const clean = applyRegressionGate(evaluateGoldPack(replayCases));
    expect(clean.passed).toBe(true);
    const regressed = applyRegressionGate(evaluateGoldPack([
      ...replayCases,
      { ...replayCases[0], id: "regression-case", goldAction: "STAY_SILENT", predictedAction: "PROMPT" },
    ]), {
      maxFalseCorrectionRate: 0,
      maxMissedErrorRate: 1,
      minSelfCorrectionCaptureRate: 0,
    });
    expect(regressed.passed).toBe(false);
    expect(regressed.failures).toContain("FALSE_CORRECTION_RATE_REGRESSION");
  });
});

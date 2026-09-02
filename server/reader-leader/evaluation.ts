import {
  EvaluationCase,
  EvaluationReport,
  RegressionGateResult,
  RegressionThresholds,
} from "@shared/contracts/reader-leader";

export const DEFAULT_REGRESSION_THRESHOLDS: RegressionThresholds = {
  maxFalseCorrectionRate: 0.05,
  maxMissedErrorRate: 0.35,
  minSelfCorrectionCaptureRate: 0.95,
};

const isCorrection = (action: EvaluationCase["predictedAction"]) =>
  action === "PROMPT" || action === "MODEL";
const isAbstention = (action: EvaluationCase["predictedAction"]) =>
  action === "STAY_SILENT" || action === "ESCALATE";

export function evaluateGoldPack(input: unknown): EvaluationReport {
  const cases = Array.isArray(input)
    ? input.map(item => EvaluationCase.parse(item))
    : [];
  if (cases.length === 0) {
    return EvaluationReport.parse({
      total: 0,
      falseCorrectionRate: 0,
      missedErrorRate: 0,
      abstentionRate: 0,
      selfCorrectionCaptureRate: 1,
      overrideRate: 0,
      bySpeakerGroup: {},
    });
  }

  const falseCorrections = cases.filter(caseItem =>
    caseItem.goldAction === "STAY_SILENT" && isCorrection(caseItem.predictedAction),
  ).length;
  const trueErrors = cases.filter(caseItem =>
    caseItem.goldAction === "PROMPT" || caseItem.goldAction === "MODEL" || caseItem.goldAction === "ESCALATE",
  );
  const missedErrors = trueErrors.filter(caseItem => isAbstention(caseItem.predictedAction)).length;
  const selfCorrectionCases = cases.filter(caseItem => caseItem.selfCorrectionDetected);
  const capturedSelfCorrections = selfCorrectionCases.filter(caseItem =>
    !caseItem.predictedInterrupted && isAbstention(caseItem.predictedAction),
  ).length;
  const groups: Record<string, { total: number; falseCorrectionRate: number }> = {};

  for (const caseItem of cases) {
    const group = groups[caseItem.speakerGroup] ?? { total: 0, falseCorrectionRate: 0 };
    group.total += 1;
    if (caseItem.goldAction === "STAY_SILENT" && isCorrection(caseItem.predictedAction)) {
      group.falseCorrectionRate += 1;
    }
    groups[caseItem.speakerGroup] = group;
  }
  for (const group of Object.values(groups)) {
    group.falseCorrectionRate /= group.total;
  }

  return EvaluationReport.parse({
    total: cases.length,
    falseCorrectionRate: falseCorrections / cases.length,
    missedErrorRate: missedErrors / Math.max(1, trueErrors.length),
    abstentionRate: cases.filter(caseItem => isAbstention(caseItem.predictedAction)).length / cases.length,
    selfCorrectionCaptureRate: selfCorrectionCases.length === 0
      ? 1
      : capturedSelfCorrections / selfCorrectionCases.length,
    overrideRate: cases.filter(caseItem => caseItem.overridden).length / cases.length,
    bySpeakerGroup: groups,
  });
}

export function applyRegressionGate(
  reportInput: unknown,
  thresholdsInput: unknown = DEFAULT_REGRESSION_THRESHOLDS,
): RegressionGateResult {
  const report = EvaluationReport.parse(reportInput);
  const thresholds = RegressionThresholds.parse(thresholdsInput);
  const failures: string[] = [];
  if (report.falseCorrectionRate > thresholds.maxFalseCorrectionRate) {
    failures.push("FALSE_CORRECTION_RATE_REGRESSION");
  }
  if (report.missedErrorRate > thresholds.maxMissedErrorRate) {
    failures.push("MISSED_ERROR_RATE_REGRESSION");
  }
  if (report.selfCorrectionCaptureRate < thresholds.minSelfCorrectionCaptureRate) {
    failures.push("SELF_CORRECTION_CAPTURE_REGRESSION");
  }

  return RegressionGateResult.parse({
    passed: failures.length === 0,
    failures,
    thresholds,
    report,
  });
}

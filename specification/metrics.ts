import { Action } from "../contracts/domain.js";

export type GoldCase = { goldAction: Action; predictedAction: Action; selfCorrectionDetected?: boolean; predictedInterrupted?: boolean; speakerGroup: string };
export type EvaluationReport = { total: number; falseCorrectionRate: number; missedErrorRate: number; abstentionRate: number; selfCorrectionCaptureRate: number; bySpeakerGroup: Record<string, { total: number; falseCorrectionRate: number }> };

const isCorrection = (action: Action) => action === "PROMPT" || action === "MODEL";
const isAbstention = (action: Action) => action === "STAY_SILENT" || action === "ESCALATE";

export function evaluate(cases: GoldCase[]): EvaluationReport {
  if (cases.length === 0) return { total: 0, falseCorrectionRate: 0, missedErrorRate: 0, abstentionRate: 0, selfCorrectionCaptureRate: 1, bySpeakerGroup: {} };
  const falseCorrections = cases.filter(c => c.goldAction === "STAY_SILENT" && isCorrection(c.predictedAction)).length;
  const trueErrors = cases.filter(c => isCorrection(c.goldAction) || c.goldAction === "ESCALATE");
  const missedErrors = trueErrors.filter(c => isAbstention(c.predictedAction)).length;
  const selfCases = cases.filter(c => c.selfCorrectionDetected);
  const capturedSelf = selfCases.filter(c => !c.predictedInterrupted && isAbstention(c.predictedAction)).length;
  const groups: EvaluationReport["bySpeakerGroup"] = {};
  for (const c of cases) {
    const group = groups[c.speakerGroup] ?? { total: 0, falseCorrectionRate: 0 };
    group.total += 1;
    if (c.goldAction === "STAY_SILENT" && isCorrection(c.predictedAction)) group.falseCorrectionRate += 1;
    groups[c.speakerGroup] = group;
  }
  for (const group of Object.values(groups)) group.falseCorrectionRate /= group.total;
  return {
    total: cases.length,
    falseCorrectionRate: falseCorrections / cases.length,
    missedErrorRate: missedErrors / Math.max(1, trueErrors.length),
    abstentionRate: cases.filter(c => isAbstention(c.predictedAction)).length / cases.length,
    selfCorrectionCaptureRate: selfCases.length ? capturedSelf / selfCases.length : 1,
    bySpeakerGroup: groups,
  };
}

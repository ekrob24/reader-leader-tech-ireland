import { randomUUID } from "node:crypto";
import {
  AgentDecision,
  AppendOnlyOverride,
  AppendOnlyOverrideInput,
  ChildSafeFeedback,
  EvidenceBundle,
  TeacherBriefing,
} from "@shared/contracts/reader-leader";

const childTemplates = {
  PROMPT: { template: "ENCOURAGE_RETRY", message: "Try that word once more.", speak: true },
  MODEL: { template: "CELEBRATE_READING", message: "Nice reading. Keep going.", speak: true },
  STAY_SILENT: { template: "WAIT_AND_LISTEN", message: "", speak: false },
  ESCALATE: { template: "ASK_TEACHER", message: "Let’s check this together.", speak: true },
} as const;

export function projectChildSafeFeedback(decisionInput: unknown): ChildSafeFeedback {
  const decision = AgentDecision.parse(decisionInput);
  return ChildSafeFeedback.parse(childTemplates[decision.action]);
}

export function createTeacherBriefing(
  evidenceInput: unknown,
  decisionInput: unknown,
): TeacherBriefing {
  const evidence = EvidenceBundle.parse(evidenceInput);
  const decision = AgentDecision.parse(decisionInput);
  const headline = decision.action === "STAY_SILENT"
    ? "No child-facing intervention recommended"
    : decision.action === "ESCALATE"
      ? "Human listening recommended"
      : `${decision.action === "MODEL" ? "Model" : "Prompt"} suggested for review`;

  return TeacherBriefing.parse({
    traceId: decision.traceId,
    headline,
    summary: `${decision.reasonCode.replaceAll("_", " ").toLowerCase()}. Evidence confidence is ${Math.round(Math.min(evidence.audioConfidence, evidence.alignmentConfidence, evidence.lexicalConfidence, evidence.pronunciationConfidence) * 100)}%.`,
    action: decision.action,
    confidence: decision.confidence,
    evidenceRefs: Array.from(new Set([...evidence.evidenceRefs, ...decision.evidenceRefs])),
    canOverride: true,
  });
}

export function appendHumanOverride(input: unknown): AppendOnlyOverride {
  const parsed = AppendOnlyOverrideInput.parse(input);
  return AppendOnlyOverride.parse({
    ...parsed,
    id: randomUUID(),
    createdAt: new Date(),
  });
}

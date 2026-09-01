import {
  AgentDecision,
  EvidenceBundle,
} from "@shared/contracts/reader-leader";

export const JUDGEMENT_MODEL = "gpt-5-mini";
export const JUDGEMENT_SETTINGS = {
  temperature: 0,
  reasoningEffort: "medium" as const,
  maxOutputTokens: 700,
  maxToolLoops: 1,
  structuredOutput: true,
  webAccess: false,
};

export const JUDGEMENT_STARTER_PROMPT =
  "You are the Reader Leader Judgement Agent. Propose exactly one bounded action: PROMPT, MODEL, STAY_SILENT, or ESCALATE. Use only supplied evidence. Preserve self-correction and treat valid regional pronunciation as correct. Prefer STAY_SILENT or ESCALATE when confidence is uncertain. Never diagnose or address the child directly.";

export type JudgementTools = Readonly<{
  getEvidence: (sessionId: string, wordEventId: string) => Promise<EvidenceBundle>;
}>;

export type ModelRunner = (input: {
  model: string;
  temperature: number;
  reasoningEffort: "medium";
  maxOutputTokens: number;
  system: string;
  evidence: EvidenceBundle;
}) => Promise<unknown>;

export async function runJudgementAgent(input: {
  sessionId: string;
  wordEventId: string;
  traceId: string;
  tools: JudgementTools;
  modelRunner: ModelRunner;
}): Promise<AgentDecision> {
  const evidence = await input.tools.getEvidence(input.sessionId, input.wordEventId);
  const raw = await input.modelRunner({
    model: JUDGEMENT_MODEL,
    temperature: JUDGEMENT_SETTINGS.temperature,
    reasoningEffort: JUDGEMENT_SETTINGS.reasoningEffort,
    maxOutputTokens: JUDGEMENT_SETTINGS.maxOutputTokens,
    system: JUDGEMENT_STARTER_PROMPT,
    evidence,
  });

  const candidate = typeof raw === "object" && raw !== null ? raw : {};
  return AgentDecision.parse({
    ...candidate,
    traceId: input.traceId,
    policyVersion: evidence.policyVersion,
    evidenceRefs: evidence.evidenceRefs,
    eventType: evidence.eventType,
  });
}

export function deterministicFallback(
  evidence: EvidenceBundle,
  traceId: string,
): AgentDecision {
  return AgentDecision.parse({
    action: evidence.pronunciationContext === "UNCERTAIN" ? "ESCALATE" : "STAY_SILENT",
    eventType: evidence.eventType,
    reasonCode: "MODEL_UNAVAILABLE_SAFE_FALLBACK",
    confidence: 0.99,
    evidenceRefs: evidence.evidenceRefs,
    teacherNote: "Model unavailable; safe fallback applied. Human review is required for interpretation.",
    policyVersion: evidence.policyVersion,
    traceId,
  });
}

import { AgentDecision, EvidenceBundle, PolicyResult } from "../contracts/domain.js";

export type PolicyConfig = {
  minEvidenceConfidence: number;
  minActionConfidence: number;
  patienceWindowMs: number;
};

const DEFAULTS: PolicyConfig = {
  minEvidenceConfidence: 0.70,
  minActionConfidence: 0.70,
  patienceWindowMs: 1200,
};

function weakestEvidence(e: EvidenceBundle): number {
  return Math.min(e.audioConfidence, e.alignmentConfidence, e.lexicalConfidence, e.pronunciationConfidence);
}

export function validateDecision(
  rawDecision: unknown,
  evidence: EvidenceBundle,
  config: PolicyConfig = DEFAULTS,
): PolicyResult {
  const parsed = AgentDecision.safeParse(rawDecision);
  const fallbackAction = evidence.eventType === "UNCERTAIN" ? "ESCALATE" : "STAY_SILENT";
  const traceId = parsed.success ? parsed.data.traceId : `invalid-${evidence.wordEventId}`;

  if (!parsed.success) {
    return {
      accepted: false,
      action: fallbackAction,
      reasonCode: "INVALID_AGENT_OUTPUT",
      violations: parsed.error.issues.map((issue) => issue.path.join(".") + ": " + issue.message),
      auditEvent: { traceId, policyVersion: evidence.policyVersion, originalAction: fallbackAction, validatedAction: fallbackAction },
    };
  }

  const d = parsed.data;
  const violations: string[] = [];
  const weak = weakestEvidence(evidence);

  if (d.policyVersion !== evidence.policyVersion) violations.push("POLICY_VERSION_MISMATCH");
  if (!evidence.evidenceRefs.every((ref) => d.evidenceRefs.includes(ref))) violations.push("MISSING_EVIDENCE_REFERENCE");
  if (d.eventType !== evidence.eventType) violations.push("EVENT_TYPE_MISMATCH");
  if (weak < config.minEvidenceConfidence) violations.push("LOW_EVIDENCE_CONFIDENCE");
  if (d.confidence < config.minActionConfidence) violations.push("LOW_ACTION_CONFIDENCE");
  if (evidence.selfCorrectionDetected || evidence.eventType === "SELF_CORRECTION") violations.push("SELF_CORRECTION_PROTECTION");
  if (evidence.pauseBeforeInterventionMs < config.patienceWindowMs) violations.push("PATIENCE_WINDOW_NOT_MET");
  if (evidence.pronunciationContext === "VALID_REGIONAL_VARIANT" && d.action !== "STAY_SILENT") violations.push("REGIONAL_VARIANT_MUST_STAY_SILENT");
  if (evidence.pronunciationContext === "UNCERTAIN" && d.action !== "ESCALATE" && d.action !== "STAY_SILENT") violations.push("UNCERTAIN_PRONUNCIATION_REQUIRES_ABSTENTION");
  if (evidence.eventType === "CORRECT" && d.action !== "STAY_SILENT") violations.push("CORRECT_EVENT_MUST_STAY_SILENT");

  const mustAbstain = violations.some((v) => ["LOW_EVIDENCE_CONFIDENCE", "LOW_ACTION_CONFIDENCE", "SELF_CORRECTION_PROTECTION", "PATIENCE_WINDOW_NOT_MET", "REGIONAL_VARIANT_MUST_STAY_SILENT", "UNCERTAIN_PRONUNCIATION_REQUIRES_ABSTENTION", "CORRECT_EVENT_MUST_STAY_SILENT"].includes(v));
  const validatedAction = mustAbstain
    ? (evidence.pronunciationContext === "UNCERTAIN" || weak < 0.45 ? "ESCALATE" : "STAY_SILENT")
    : d.action;
  const accepted = violations.length === 0;

  return {
    accepted,
    action: validatedAction,
    reasonCode: accepted ? d.reasonCode : `POLICY_OVERRIDE:${violations[0] ?? "UNKNOWN"}`,
    violations,
    auditEvent: { traceId: d.traceId, policyVersion: evidence.policyVersion, originalAction: d.action, validatedAction },
  };
}

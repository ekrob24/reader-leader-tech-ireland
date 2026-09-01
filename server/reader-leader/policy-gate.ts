import {
  AgentDecision,
  EvidenceBundle,
  PolicyConfig,
  PolicyResult,
} from "@shared/contracts/reader-leader";

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  minEvidenceConfidence: 0.7,
  minActionConfidence: 0.7,
  patienceWindowMs: 1200,
};

function weakestEvidence(evidence: EvidenceBundle): number {
  return Math.min(
    evidence.audioConfidence,
    evidence.alignmentConfidence,
    evidence.lexicalConfidence,
    evidence.pronunciationConfidence,
  );
}

const abstentionViolations = new Set([
  "LOW_EVIDENCE_CONFIDENCE",
  "LOW_ACTION_CONFIDENCE",
  "SELF_CORRECTION_PROTECTION",
  "PATIENCE_WINDOW_NOT_MET",
  "REGIONAL_VARIANT_MUST_STAY_SILENT",
  "UNCERTAIN_PRONUNCIATION_REQUIRES_ABSTENTION",
  "CORRECT_EVENT_MUST_STAY_SILENT",
]);

export function validateDecision(
  rawDecision: unknown,
  evidence: EvidenceBundle,
  rawConfig: PolicyConfig = DEFAULT_POLICY_CONFIG,
): PolicyResult {
  const config = PolicyConfig.parse(rawConfig);
  const parsed = AgentDecision.safeParse(rawDecision);
  const fallbackAction = evidence.eventType === "UNCERTAIN" ? "ESCALATE" : "STAY_SILENT";
  const traceId = parsed.success ? parsed.data.traceId : `invalid-${evidence.wordEventId}`;

  if (!parsed.success) {
    return {
      accepted: false,
      action: fallbackAction,
      reasonCode: "INVALID_AGENT_OUTPUT",
      violations: parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`),
      auditEvent: {
        traceId,
        policyVersion: evidence.policyVersion,
        originalAction: fallbackAction,
        validatedAction: fallbackAction,
      },
    };
  }

  const decision = parsed.data;
  const violations: string[] = [];
  const weakest = weakestEvidence(evidence);

  if (decision.policyVersion !== evidence.policyVersion) violations.push("POLICY_VERSION_MISMATCH");
  if (!evidence.evidenceRefs.every(ref => decision.evidenceRefs.includes(ref))) {
    violations.push("MISSING_EVIDENCE_REFERENCE");
  }
  if (decision.eventType !== evidence.eventType) violations.push("EVENT_TYPE_MISMATCH");
  if (weakest < config.minEvidenceConfidence) violations.push("LOW_EVIDENCE_CONFIDENCE");
  if (decision.confidence < config.minActionConfidence) violations.push("LOW_ACTION_CONFIDENCE");
  if (evidence.selfCorrectionDetected || evidence.eventType === "SELF_CORRECTION") {
    violations.push("SELF_CORRECTION_PROTECTION");
  }
  if (evidence.pauseBeforeInterventionMs < config.patienceWindowMs) {
    violations.push("PATIENCE_WINDOW_NOT_MET");
  }
  if (
    evidence.pronunciationContext === "VALID_REGIONAL_VARIANT" &&
    decision.action !== "STAY_SILENT"
  ) {
    violations.push("REGIONAL_VARIANT_MUST_STAY_SILENT");
  }
  if (
    evidence.pronunciationContext === "UNCERTAIN" &&
    decision.action !== "ESCALATE" &&
    decision.action !== "STAY_SILENT"
  ) {
    violations.push("UNCERTAIN_PRONUNCIATION_REQUIRES_ABSTENTION");
  }
  if (evidence.eventType === "CORRECT" && decision.action !== "STAY_SILENT") {
    violations.push("CORRECT_EVENT_MUST_STAY_SILENT");
  }

  const mustAbstain = violations.some(violation => abstentionViolations.has(violation));
  const validatedAction = mustAbstain
    ? evidence.pronunciationContext === "UNCERTAIN" || weakest < 0.45
      ? "ESCALATE"
      : "STAY_SILENT"
    : decision.action;
  const accepted = violations.length === 0;

  return {
    accepted,
    action: validatedAction,
    reasonCode: accepted ? decision.reasonCode : `POLICY_OVERRIDE:${violations[0] ?? "UNKNOWN"}`,
    violations,
    auditEvent: {
      traceId: decision.traceId,
      policyVersion: evidence.policyVersion,
      originalAction: decision.action,
      validatedAction,
    },
  };
}

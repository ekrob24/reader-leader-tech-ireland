import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  Action,
  AgentDecision,
  EvidenceBundle,
  FixtureEvidenceCase,
  FixtureEvidencePack,
} from "@shared/contracts/reader-leader";
import { classifyPronunciationContext } from "./reader-leader/pronunciation-context";
import {
  deterministicFallback,
  runJudgementAgent,
} from "./reader-leader/judgement-agent";
import { validateDecision } from "./reader-leader/policy-gate";
import {
  loadGoldPack,
  loadGoldPackFromValue,
} from "./fixtures/evidence-loader";
import {
  loadFixtureEvidencePack,
  selectEvidenceCase,
  selectEvidenceForSession,
} from "./reader-leader/s1-s3";
import {
  canClientMutate,
  canInsertHumanReview,
  canReadAudit,
  canReadConsent,
  canReadOrgScopedResource,
  canReadMembership,
} from "@shared/rls/s1-s3-boundaries";

const migrationPath = fileURLToPath(
  new URL("../supabase/migrations/20260901000000_reader_leader_s1_s3.sql", import.meta.url),
);

function validDecision() {
  return {
    action: "PROMPT",
    eventType: "SUBSTITUTION",
    reasonCode: "CLEAR_SUBSTITUTION",
    confidence: 0.95,
    evidenceRefs: ["ev-001", "align-001"],
    teacherNote: "Review the substitution.",
    policyVersion: "policy-2026.09.1",
    traceId: "trace-001",
  } as const;
}

describe("S1 · shared contracts", () => {
  it("accepts canonical evidence and rejects unknown actions", async () => {
    const pack = await loadGoldPack();
    expect(EvidenceBundle.safeParse(pack.cases[0]).success).toBe(true);
    expect(AgentDecision.safeParse(validDecision()).success).toBe(true);
    expect(AgentDecision.safeParse({ ...validDecision(), action: "CORRECT" }).success).toBe(false);
  });

  it("rejects confidence outside the closed [0, 1] boundary", async () => {
    const pack = await loadGoldPack();
    expect(
      EvidenceBundle.safeParse({ ...pack.cases[0], audioConfidence: 1.01 }).success,
    ).toBe(false);
    expect(
      EvidenceBundle.safeParse({ ...pack.cases[0], pronunciationConfidence: -0.01 }).success,
    ).toBe(false);
  });

  it("preserves the four-action vocabulary only", () => {
    expect(Action.options).toEqual(["PROMPT", "MODEL", "STAY_SILENT", "ESCALATE"]);
  });
});

describe("S2 · Supabase foundation and RLS boundaries", () => {
  it("declares every S1–S3 table, enum, index, and RLS helper", async () => {
    const sql = await readFile(migrationPath, "utf8");
    for (const name of [
      "organisations",
      "memberships",
      "learners",
      "consents",
      "passages",
      "reading_sessions",
      "evidence_bundles",
      "agent_decisions",
      "human_reviews",
      "audit_events",
    ]) {
      expect(sql).toContain(`public.${name}`);
    }
    expect(sql).toContain("create type public.action");
    expect(sql).toContain("create type public.session_status");
    expect(sql).toContain("create or replace function public.is_org_member");
    expect(sql).toContain("create or replace function public.has_role");
    expect(sql).toContain("alter table public.evidence_bundles enable row level security");
    expect(sql).toContain("create policy evidence_org_read");
    expect(sql).toContain("create policy decision_org_read");
    expect(sql).toContain("revoke insert, update, delete on public.audit_events");
    expect(sql).toContain("revoke all on public.audit_events");
  });

  it("keeps evidence and decision reads organisation-scoped", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toMatch(/evidence_org_read[\s\S]*?s\.organisation_id\)\)/);
    expect(sql).toMatch(/decision_org_read[\s\S]*?s\.organisation_id\)\)/);
    expect(sql).toContain("reviewer_id = auth.uid()");
  });
});

describe("S2 · behavioral RLS boundary model", () => {
  const memberships = [
    { userId: "teacher-a", organisationId: "org-a", role: "teacher_set" as const },
    { userId: "guardian-b", organisationId: "org-b", role: "guardian" as const },
    { userId: "admin-a", organisationId: "org-a", role: "school_admin" as const },
  ];

  it("isolates organisation-scoped sessions, evidence, and decisions", () => {
    const teacherA = { userId: "teacher-a", memberships } as const;
    const guardianB = { userId: "guardian-b", memberships } as const;
    expect(canReadOrgScopedResource(teacherA, "org-a")).toBe(true);
    expect(canReadOrgScopedResource(teacherA, "org-b")).toBe(false);
    expect(canReadOrgScopedResource(guardianB, "org-b")).toBe(true);
    expect(canReadOrgScopedResource(guardianB, "org-a")).toBe(false);
  });

  it("allows self membership reads and guardian consent reads without cross-tenant leakage", () => {
    const guardianB = { userId: "guardian-b", memberships } as const;
    expect(canReadMembership(guardianB, memberships[1])).toBe(true);
    expect(canReadMembership(guardianB, memberships[0])).toBe(false);
    expect(canReadConsent(guardianB, { guardianId: "guardian-b", learnerOrganisationId: "org-a" })).toBe(true);
    expect(canReadConsent(guardianB, { guardianId: "guardian-x", learnerOrganisationId: "org-a" })).toBe(false);
  });

  it("requires the authenticated reviewer and keeps audit reads actor-scoped", () => {
    const adminA = { userId: "admin-a", memberships } as const;
    expect(canInsertHumanReview(adminA, "admin-a")).toBe(true);
    expect(canInsertHumanReview(adminA, "teacher-a")).toBe(false);
    expect(canReadAudit(adminA, "admin-a")).toBe(true);
    expect(canReadAudit(adminA, "teacher-a")).toBe(false);
    expect(canReadAudit(adminA, null)).toBe(false);
  });

  it("models immutable evidence, decisions, audits, and non-in-place reviews", () => {
    for (const resource of ["evidence_bundles", "agent_decisions", "audit_events"] as const) {
      for (const operation of ["insert", "update", "delete"] as const) {
        expect(canClientMutate(resource, operation)).toBe(false);
      }
    }
    expect(canClientMutate("human_reviews", "insert")).toBe(true);
    expect(canClientMutate("human_reviews", "update")).toBe(false);
    expect(canClientMutate("human_reviews", "delete")).toBe(false);
  });
});

describe("S4 · pronunciation-context classification", () => {
  const input = {
    referenceWord: "again",
    observedForm: "agen",
    region: "IE",
    lexicon: [
      { referenceWord: "again", regionalForm: "agen", region: "IE", evidenceRef: "pron-irish-west-01" },
    ],
  } as const;

  it("classifies an approved regional form with lexicon evidence", () => {
    expect(classifyPronunciationContext(input)).toEqual({
      context: "VALID_REGIONAL_VARIANT",
      matched: true,
      confidence: 1,
      evidenceRefs: ["pron-irish-west-01"],
      reasonCode: "VALID_REGIONAL_VARIANT",
    });
  });

  it("distinguishes exact matches, lexical mismatches, and missing observations", () => {
    expect(classifyPronunciationContext({ ...input, observedForm: "again" }).context).toBe("NOT_MATCHED");
    expect(classifyPronunciationContext({ ...input, observedForm: "agen", lexicon: [] }).context).toBe("NOT_MATCHED");
    expect(classifyPronunciationContext({ ...input, observedForm: null }).context).toBe("UNCERTAIN");
  });

  it("does not confirm a regional variant when the region is not confirmed", () => {
    expect(
      classifyPronunciationContext({
        ...input,
        lexicon: [{ ...input.lexicon[0], region: "GB" }],
      }).context,
    ).toBe("UNCERTAIN");
  });
});

describe("S5 · bounded judgement", () => {
  it("parses structured output and pins evidence metadata over model claims", async () => {
    const evidence = (await loadGoldPack()).cases[0];
    const result = await runJudgementAgent({
      sessionId: evidence.sessionId,
      wordEventId: evidence.wordEventId,
      traceId: "trace-s5",
      tools: { getEvidence: async () => evidence },
      modelRunner: async () => ({
        action: "PROMPT",
        eventType: "CORRECT",
        reasonCode: "CLEAR_SUBSTITUTION",
        confidence: 0.9,
        evidenceRefs: ["invented-ref"],
        teacherNote: "Review the event.",
        policyVersion: "forged-policy",
        traceId: "forged-trace",
      }),
    });
    expect(result.traceId).toBe("trace-s5");
    expect(result.policyVersion).toBe(evidence.policyVersion);
    expect(result.eventType).toBe(evidence.eventType);
    expect(result.evidenceRefs).toEqual(evidence.evidenceRefs);
  });

  it("provides a safe deterministic fallback when the model is unavailable", async () => {
    const evidence = (await loadGoldPack()).cases[3];
    expect(deterministicFallback(evidence, "trace-fallback")).toMatchObject({
      action: "ESCALATE",
      reasonCode: "MODEL_UNAVAILABLE_SAFE_FALLBACK",
      traceId: "trace-fallback",
    });
  });
});

describe("S6 · deterministic policy gate", () => {
  it("accepts a high-confidence substitution after patience", async () => {
    const evidence = (await loadGoldPack()).cases[0];
    const result = validateDecision(validDecision(), evidence);
    expect(result).toMatchObject({ accepted: true, action: "PROMPT" });
  });

  it("forces valid regional pronunciation and correct events to silence", async () => {
    const pack = await loadGoldPack();
    const regional = pack.cases[1];
    const regionalResult = validateDecision({ ...validDecision(), eventType: regional.eventType }, regional);
    expect(regionalResult.action).toBe("STAY_SILENT");
    expect(regionalResult.violations).toContain("REGIONAL_VARIANT_MUST_STAY_SILENT");

    const correctResult = validateDecision(
      { ...validDecision(), eventType: "CORRECT" },
      { ...regional, eventType: "CORRECT", pronunciationContext: "NOT_MATCHED" },
    );
    expect(correctResult.action).toBe("STAY_SILENT");
    expect(correctResult.violations).toContain("CORRECT_EVENT_MUST_STAY_SILENT");
  });

  it("protects self-correction and escalates weak or uncertain evidence", async () => {
    const pack = await loadGoldPack();
    const self = pack.cases[2];
    const selfResult = validateDecision({ ...validDecision(), eventType: self.eventType }, self);
    expect(selfResult.action).toBe("STAY_SILENT");
    expect(selfResult.violations).toContain("SELF_CORRECTION_PROTECTION");

    const weak = pack.cases[3];
    const weakResult = validateDecision({ ...validDecision(), eventType: weak.eventType, confidence: 0.95 }, weak);
    expect(weakResult.action).toBe("ESCALATE");
    expect(weakResult.violations).toContain("LOW_EVIDENCE_CONFIDENCE");
  });

  it("fails closed for malformed output, mismatched metadata, and patience violations", async () => {
    const evidence = (await loadGoldPack()).cases[0];
    const malformed = validateDecision({ action: "PROMPT" }, evidence);
    expect(malformed).toMatchObject({ accepted: false, action: "STAY_SILENT", reasonCode: "INVALID_AGENT_OUTPUT" });

    const mismatch = validateDecision({ ...validDecision(), policyVersion: "wrong-policy" }, evidence);
    expect(mismatch.action).toBe("PROMPT");
    expect(mismatch.violations).toContain("POLICY_VERSION_MISMATCH");

    const impatient = validateDecision(
      { ...validDecision(), eventType: "SUBSTITUTION" },
      { ...evidence, pauseBeforeInterventionMs: 100 },
    );
    expect(impatient.action).toBe("STAY_SILENT");
    expect(impatient.violations).toContain("PATIENCE_WINDOW_NOT_MET");
  });
});

describe("S3 · deterministic fixture evidence", () => {
  it("loads the canonical five-case pack in stable order and freezes it", async () => {
    const first = await loadFixtureEvidencePack();
    const second = await loadFixtureEvidencePack();
    expect(first.version).toBe("gold-pack-1");
    expect(first.cases.map(item => item.id)).toEqual([
      "case-true-substitution",
      "case-valid-regional-variant",
      "case-self-correction",
      "case-low-audio",
      "case-omission",
    ]);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.cases)).toBe(true);
  });

  it("preserves confidence components and expected gold actions", async () => {
    const pack = await loadGoldPack();
    expect(pack.cases.map(item => item.goldAction)).toEqual([
      "PROMPT",
      "STAY_SILENT",
      "STAY_SILENT",
      "ESCALATE",
      "MODEL",
    ]);
    expect(pack.cases[3]).toMatchObject({
      audioConfidence: 0.31,
      alignmentConfidence: 0.42,
      lexicalConfidence: 0.55,
      pronunciationConfidence: 0.51,
      pronunciationContext: "UNCERTAIN",
    });
  });

  it("fails closed for malformed or duplicate fixture evidence", async () => {
    const pack = await loadGoldPack();
    expect(() => loadGoldPackFromValue([{ ...pack.cases[0], goldAction: "UNKNOWN" }])).toThrow(
      "Invalid gold-pack case",
    );
    expect(() =>
      loadGoldPackFromValue([pack.cases[0], { ...pack.cases[0] }]),
    ).toThrow("Duplicate gold-pack case id");
  });

  it("selects exactly one case by id or session and rejects missing boundaries", async () => {
    const pack = await loadGoldPack();
    expect(selectEvidenceCase(pack, "case-low-audio").eventType).toBe("UNCERTAIN");
    expect(selectEvidenceForSession(pack, "session-002").pronunciationContext).toBe(
      "VALID_REGIONAL_VARIANT",
    );
    expect(() => selectEvidenceCase(pack, "missing-case")).toThrow("Unknown fixture evidence case");
    expect(() => selectEvidenceForSession(pack, "missing-session")).toThrow(
      "No fixture evidence for session",
    );
  });

  it("keeps fixture data within the S1–S3 evidence boundary", async () => {
    const pack = await loadGoldPack();
    for (const item of pack.cases) {
      expect(FixtureEvidenceCase.safeParse(item).success).toBe(true);
      expect(FixtureEvidencePack.safeParse(pack).success).toBe(true);
      expect(item).not.toHaveProperty("childFeedback");
      expect(item).not.toHaveProperty("speechAudio");
      expect(item).not.toHaveProperty("agentToolCalls");
    }
  });
});

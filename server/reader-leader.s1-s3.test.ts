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
    evidenceRefs: ["ev-001"],
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

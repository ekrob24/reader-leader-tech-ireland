import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { Client } = pg;
const databaseUrl = process.env.SUPABASE_DB_URL;
const test = databaseUrl ? it : it.skip;

type FixtureIds = {
  userA: string;
  userB: string;
  userC: string;
  userD: string;
  organisationA: string;
  organisationB: string;
  learnerA: string;
  passageA: string;
  sessionA: string;
  evidenceA: string;
  decisionA: string;
};

const ids: FixtureIds = {
  userA: randomUUID(),
  userB: randomUUID(),
  userC: randomUUID(),
  userD: randomUUID(),
  organisationA: randomUUID(),
  organisationB: randomUUID(),
  learnerA: randomUUID(),
  passageA: randomUUID(),
  sessionA: randomUUID(),
  evidenceA: randomUUID(),
  decisionA: randomUUID(),
};

let admin: pg.Client;

async function asUser<T>(userId: string, callback: (client: pg.Client) => Promise<T>): Promise<T> {
  await admin.query("begin");
  try {
    await admin.query("set local role authenticated");
    await admin.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    const result = await callback(admin);
    await admin.query("rollback");
    return result;
  } catch (error) {
    await admin.query("rollback");
    throw error;
  }
}

beforeAll(async () => {
  if (!databaseUrl) return;
  admin = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await admin.connect();

  await admin.query(
    `insert into auth.users (id, aud, role, email)
     values ($1, 'authenticated', 'authenticated', $2), ($3, 'authenticated', 'authenticated', $4),
            ($5, 'authenticated', 'authenticated', $6), ($7, 'authenticated', 'authenticated', $8)
     on conflict (id) do nothing`,
    [ids.userA, `${ids.userA}@reader-leader.test`, ids.userB, `${ids.userB}@reader-leader.test`, ids.userC, `${ids.userC}@reader-leader.test`, ids.userD, `${ids.userD}@reader-leader.test`],
  );
  await admin.query(
    `insert into public.organisations (id, name, region)
     values ($1, 'Organisation A', 'IE'), ($2, 'Organisation B', 'IE')`,
    [ids.organisationA, ids.organisationB],
  );
  await admin.query(
    `insert into public.memberships (user_id, organisation_id, role)
     values ($1, $2, 'teacher_set'), ($3, $4, 'guardian'), ($5, $2, 'guardian'), ($6, $2, 'content_steward')`,
    [ids.userA, ids.organisationA, ids.userB, ids.organisationB, ids.userC, ids.userD],
  );
  await admin.query(
    `insert into public.learners (id, organisation_id, display_name, pronunciation_set_id, safe_label)
     values ($1, $2, 'Fixture learner', 'ie-default', 'Fixture learner')`,
    [ids.learnerA, ids.organisationA],
  );
  await admin.query(
    `insert into public.passages (id, organisation_id, title, body, approval_status, rights_status, safety_status, creation_idempotency_key)
     values ($1, $2, 'Fixture passage', 'The reader leader passage.', 'APPROVED', 'CLEARED', 'PASSED', $3)`,
    [ids.passageA, ids.organisationA, `fixture-passage-${ids.passageA}`],
  );
  await admin.query(
    `insert into public.reading_sessions (id, organisation_id, learner_id, passage_id, idempotency_key, status)
     values ($1, $2, $3, $4, $5, 'READY')`,
    [ids.sessionA, ids.organisationA, ids.learnerA, ids.passageA, `rls-${ids.sessionA}`],
  );
  await admin.query(
    `insert into public.evidence_bundles
      (id, session_id, word_event_id, token_index, reference_word, observed_form, event_type,
       audio_confidence, alignment_confidence, lexical_confidence, pronunciation_confidence,
       pronunciation_context, evidence_refs, provider, provider_version, policy_version)
     values ($1, $2, 'rls-event', 0, 'reader', 'reader', 'CORRECT',
       0.95, 0.95, 0.95, 0.95, 'NOT_MATCHED', array['rls-evidence'], 'fixture', 'rls-1', 'rls-policy')`,
    [ids.evidenceA, ids.sessionA],
  );
  await admin.query(
    `insert into public.agent_decisions
      (id, session_id, word_event_id, action, event_type, reason_code, confidence,
       evidence_refs, teacher_note, policy_version, trace_id)
     values ($1, $2, 'rls-event', 'STAY_SILENT', 'CORRECT', 'RLS_FIXTURE', 0.95,
       array['rls-evidence'], 'Fixture decision.', 'rls-policy', $3)`,
    [ids.decisionA, ids.sessionA, `rls-trace-${ids.decisionA}`],
  );
  await admin.query(
    `insert into public.audit_events (actor_type, actor_id, action, resource, trace_id)
     values ('integration-test', $1, 'READ', 'rls', $2)`,
    [ids.userA, `rls-audit-${ids.decisionA}`],
  );
}, 30_000);

afterAll(async () => {
  if (!admin) return;
  await admin.query("delete from public.human_reviews where agent_decision_id = $1", [ids.decisionA]);
  await admin.query("delete from public.audit_events where trace_id = $1", [`rls-audit-${ids.decisionA}`]);
  await admin.query("delete from public.agent_decisions where id = $1", [ids.decisionA]);
  await admin.query("delete from public.evidence_bundles where id = $1", [ids.evidenceA]);
  await admin.query("delete from public.reading_sessions where id = $1", [ids.sessionA]);
  await admin.query("delete from public.passages where id = $1", [ids.passageA]);
  await admin.query("delete from public.learners where id = $1", [ids.learnerA]);
  await admin.query("delete from public.memberships where organisation_id in ($1, $2)", [ids.organisationA, ids.organisationB]);
  await admin.query("delete from public.organisations where id in ($1, $2)", [ids.organisationA, ids.organisationB]);
  await admin.query("delete from auth.users where id in ($1, $2, $3, $4)", [ids.userA, ids.userB, ids.userC, ids.userD]);
  await admin.end();
}, 30_000);

describe("Supabase S2 RLS integration", () => {
  test("isolates organisation, session, evidence, and decision reads", async () => {
    const visibleToA = await asUser(ids.userA, async client => {
      const organisations = await client.query("select id from public.organisations order by id");
      const sessions = await client.query("select id from public.reading_sessions");
      const evidence = await client.query("select id from public.evidence_bundles");
      const decisions = await client.query("select id from public.agent_decisions");
      return {
        organisations: organisations.rows.map(row => row.id),
        sessions: sessions.rows.map(row => row.id),
        evidence: evidence.rows.map(row => row.id),
        decisions: decisions.rows.map(row => row.id),
      };
    });

    const visibleToB = await asUser(ids.userB, async client => {
      const organisations = await client.query("select id from public.organisations order by id");
      const sessions = await client.query("select id from public.reading_sessions");
      const evidence = await client.query("select id from public.evidence_bundles");
      const decisions = await client.query("select id from public.agent_decisions");
      return {
        organisations: organisations.rows.map(row => row.id),
        sessions: sessions.rows.map(row => row.id),
        evidence: evidence.rows.map(row => row.id),
        decisions: decisions.rows.map(row => row.id),
      };
    });

    expect(visibleToA.organisations).toEqual([ids.organisationA]);
    expect(visibleToA.sessions).toEqual([ids.sessionA]);
    expect(visibleToA.evidence).toEqual([ids.evidenceA]);
    expect(visibleToA.decisions).toEqual([ids.decisionA]);
    expect(visibleToB.organisations).toEqual([ids.organisationB]);
    expect(visibleToB.sessions).toEqual([]);
    expect(visibleToB.evidence).toEqual([]);
    expect(visibleToB.decisions).toEqual([]);
  });

  test("enforces reviewer ownership and actor-scoped audit reads", async () => {
    await asUser(ids.userA, async client => {
      await client.query(
        `insert into public.human_reviews (agent_decision_id, reviewer_id, override_action, reason, idempotency_key)
         values ($1, $2, 'MODEL', 'Human review for integration test', $3)`,
        [ids.decisionA, ids.userA, `override-${ids.decisionA}`],
      );
      await expect(
        client.query(
          `insert into public.human_reviews (agent_decision_id, reviewer_id, override_action, reason, idempotency_key)
           values ($1, $2, 'STAY_SILENT', 'Duplicate override should be rejected', $3)`,
          [ids.decisionA, ids.userA, `override-${ids.decisionA}`],
        ),
      ).rejects.toThrow();
    });

    await expect(
      asUser(ids.userB, client =>
        client.query(
          `insert into public.human_reviews (agent_decision_id, reviewer_id, override_action, reason, idempotency_key)
           values ($1, $2, 'MODEL', 'Cross-organisation guardian should be rejected', 'guardian-cross-org')`,
          [ids.decisionA, ids.userB],
        ),
      ),
    ).rejects.toThrow();

    await expect(
      asUser(ids.userC, client =>
        client.query(
          `insert into public.human_reviews (agent_decision_id, reviewer_id, override_action, reason, idempotency_key)
           values ($1, $2, 'MODEL', 'Same-organisation guardian should be rejected', 'guardian-same-org')`,
          [ids.decisionA, ids.userC],
        ),
      ),
    ).rejects.toThrow();


    await expect(
      asUser(ids.userA, client =>
        client.query("select trace_id from public.audit_events where trace_id = $1", [`rls-audit-${ids.decisionA}`]),
      ),
    ).rejects.toThrow();
    await expect(
      asUser(ids.userB, client =>
        client.query("select trace_id from public.audit_events where trace_id = $1", [`rls-audit-${ids.decisionA}`]),
      ),
    ).rejects.toThrow();
  });

  test("rejects client writes that would mutate immutable evidence and decisions", async () => {
    await expect(
      asUser(ids.userA, client =>
        client.query("update public.evidence_bundles set reference_word = 'mutated' where id = $1", [ids.evidenceA]),
      ),
    ).rejects.toThrow();
    await expect(
      asUser(ids.userA, client =>
        client.query("delete from public.agent_decisions where id = $1", [ids.decisionA]),
      ),
    ).rejects.toThrow();
  });
});


describe("Supabase learner-safety persistence integration", () => {
  test("isolates learner timeline and teacher-only audit events", async () => {
    const safetyDecision = randomUUID();
    const safetyEvent = randomUUID();
    await admin.query(
      `insert into public.learner_safety_decisions (id, learner_id, organisation_id, action, status, summary)
       values ($1, $2, $3, 'PROMPT', 'PROPOSED', 'Live learner timeline fixture')`,
      [safetyDecision, ids.learnerA, ids.organisationA],
    );
    await admin.query(
      `insert into public.learner_safety_events (id, learner_id, organisation_id, actor_id, event_type, summary, idempotency_key)
       values ($1, $2, $3, $4, 'OVERRIDE_CREATED', 'Live teacher audit fixture', $5)`,
      [safetyEvent, ids.learnerA, ids.organisationA, ids.userA, `live-${safetyEvent}`],
    );
    try {
      const teacherRows = await asUser(ids.userA, async client => ({
        timeline: (await client.query("select id from public.learner_safety_decisions where id = $1", [safetyDecision])).rows,
        audit: (await client.query("select id from public.learner_safety_events where id = $1", [safetyEvent])).rows,
      }));
      expect(teacherRows.timeline).toHaveLength(1);
      expect(teacherRows.audit).toHaveLength(1);
      const guardianRows = await asUser(ids.userB, async client => ({
        timeline: (await client.query("select id from public.learner_safety_decisions where id = $1", [safetyDecision])).rows,
        audit: (await client.query("select id from public.learner_safety_events where id = $1", [safetyEvent])).rows,
      }));
      expect(guardianRows.timeline).toHaveLength(0);
      expect(guardianRows.audit).toHaveLength(0);
      await expect(asUser(ids.userB, client => client.query("insert into public.learner_safety_events (learner_id, organisation_id, actor_id, event_type, summary, idempotency_key) values ($1, $2, $3, 'OVERRIDE_REVERSED', 'Guardian must not write', $4)", [ids.learnerA, ids.organisationA, ids.userB, `blocked-${safetyEvent}`]))).rejects.toThrow();
    } finally {
      await admin.query("delete from public.learner_safety_events where id = $1", [safetyEvent]);
      await admin.query("delete from public.learner_safety_decisions where id = $1", [safetyDecision]);
    }
  });
});

describe("Supabase Priority 1 consent lifecycle integration", () => {
  test("keeps guardian consent and deletion evidence private while prohibiting client lifecycle writes", async () => {
    const consentId = randomUUID();
    const withdrawalId = randomUUID();
    const deletionRequestId = randomUUID();
    const audioAssetId = randomUUID();
    const derivedAssetId = randomUUID();
    const receiptId = randomUUID();
    const auditId = randomUUID();
    const audioHash = "a".repeat(64);
    const derivedHash = "b".repeat(64);
    try {
      await admin.query(
        `insert into public.guardian_learner_links (guardian_id, learner_id, organisation_id)
         values ($1, $2, $3)`,
        [ids.userC, ids.learnerA, ids.organisationA],
      );
      await admin.query(
        `insert into public.consents (id, learner_id, guardian_id, purpose, training_opt_in, retention_until, status, consent_text_version, policy_version, idempotency_key)
         values ($1, $2, $3, 'READING_ASSESSMENT', false, now() + interval '30 days', 'ACTIVE', 'test-copy-1', 'test-policy-1', $4)`,
        [consentId, ids.learnerA, ids.userC, `consent-${consentId}`],
      );
      await admin.query(
        `insert into public.consent_withdrawals (id, consent_id, learner_id, guardian_id, reason, idempotency_key)
         values ($1, $2, $3, $4, 'WITHDRAWAL_OF_CONSENT', $5)`,
        [withdrawalId, consentId, ids.learnerA, ids.userC, `withdrawal-${withdrawalId}`],
      );
      const withdrawnConsent = await admin.query("select status from public.consents where id = $1", [consentId]);
      expect(withdrawnConsent.rows[0]?.status).toBe("WITHDRAWN");
      await admin.query(
        `insert into public.data_deletion_requests (id, learner_id, guardian_id, organisation_id, scope, status, idempotency_key)
         values ($1, $2, $3, $4, 'AUDIO_AND_DERIVED_DATA', 'REQUESTED', $5)`,
        [deletionRequestId, ids.learnerA, ids.userC, ids.organisationA, `deletion-${deletionRequestId}`],
      );
      const pendingDeletionConsent = await admin.query("select status from public.consents where id = $1", [consentId]);
      expect(pendingDeletionConsent.rows[0]?.status).toBe("PENDING_DELETION");
      await admin.query(
        `insert into public.audio_assets (id, learner_id, organisation_id, storage_key, storage_object_hash, sha256, retention_until, deletion_request_id)
         values ($1, $2, $3, $4, $5, $6, now() + interval '30 days', $7)`,
        [audioAssetId, ids.learnerA, ids.organisationA, `private-audio/${audioAssetId}.webm`, audioHash, audioHash, deletionRequestId],
      );
      await admin.query(
        `insert into public.derived_data_assets (id, learner_id, organisation_id, source_audio_asset_id, asset_kind, storage_key, storage_object_hash, retention_until, deletion_request_id)
         values ($1, $2, $3, $4, 'ALIGNMENT', $5, $6, now() + interval '30 days', $7)`,
        [derivedAssetId, ids.learnerA, ids.organisationA, audioAssetId, `private-derived/${derivedAssetId}.json`, derivedHash, deletionRequestId],
      );
      await admin.query(
        `insert into public.data_deletion_receipts (id, request_id, target_kind, target_reference_hash, outcome)
         values ($1, $2, 'AUDIO_ASSET', $3, 'DELETED')`,
        [receiptId, deletionRequestId, audioHash],
      );
      await admin.query(
        `insert into public.data_lifecycle_audit_events (id, organisation_id, learner_id, guardian_id, deletion_request_id, action)
         values ($1, $2, $3, $4, $5, 'DATA_DELETION_REQUESTED')`,
        [auditId, ids.organisationA, ids.learnerA, ids.userC, deletionRequestId],
      );

      const guardianVisible = await asUser(ids.userC, async client => ({
        consents: (await client.query("select id from public.consents where id = $1", [consentId])).rows,
        requests: (await client.query("select id from public.data_deletion_requests where id = $1", [deletionRequestId])).rows,
        receipts: (await client.query("select id from public.data_deletion_receipts where id = $1", [receiptId])).rows,
        audit: (await client.query("select id from public.data_lifecycle_audit_events where id = $1", [auditId])).rows,
      }));
      expect(guardianVisible.consents).toHaveLength(1);
      expect(guardianVisible.requests).toHaveLength(1);
      expect(guardianVisible.receipts).toHaveLength(1);
      expect(guardianVisible.audit).toHaveLength(1);

      const unrelatedGuardian = await asUser(ids.userB, async client => ({
        consents: (await client.query("select id from public.consents where id = $1", [consentId])).rows,
        requests: (await client.query("select id from public.data_deletion_requests where id = $1", [deletionRequestId])).rows,
        receipts: (await client.query("select id from public.data_deletion_receipts where id = $1", [receiptId])).rows,
      }));
      expect(unrelatedGuardian.consents).toHaveLength(0);
      expect(unrelatedGuardian.requests).toHaveLength(0);
      expect(unrelatedGuardian.receipts).toHaveLength(0);
      await expect(asUser(ids.userC, client => client.query(
        `insert into public.data_lifecycle_audit_events (organisation_id, learner_id, guardian_id, action)
         values ($1, $2, $3, 'GUARDIAN_CONSENT_RECORDED')`,
        [ids.organisationA, ids.learnerA, ids.userC],
      ))).rejects.toThrow();
    } finally {
      await admin.query("delete from public.data_lifecycle_audit_events where id = $1", [auditId]);
      await admin.query("delete from public.data_deletion_receipts where id = $1", [receiptId]);
      await admin.query("delete from public.derived_data_assets where id = $1", [derivedAssetId]);
      await admin.query("delete from public.audio_assets where id = $1", [audioAssetId]);
      await admin.query("delete from public.data_deletion_requests where id = $1", [deletionRequestId]);
      await admin.query("delete from public.consent_withdrawals where id = $1", [withdrawalId]);
      await admin.query("delete from public.consents where id = $1", [consentId]);
      await admin.query("delete from public.guardian_learner_links where guardian_id = $1 and learner_id = $2", [ids.userC, ids.learnerA]);
    }
  });
});

describe("Supabase content workflow integration", () => {
  test("shows drafts only to content governance and exposes approved passages to teachers", async () => {
    const passageId = randomUUID();
    const eventId = randomUUID();
    try {
      await admin.query(
        `insert into public.passages (id, organisation_id, title, body, approval_status, rights_status, safety_status, creation_idempotency_key)
         values ($1, $2, 'Review fixture', 'This passage is under adult review.', 'DRAFT', 'UNREVIEWED', 'UNREVIEWED', $3)`,
        [passageId, ids.organisationA, `draft-${passageId}`],
      );
      await admin.query(
        `insert into public.content_review_events (id, passage_id, organisation_id, reviewer_id, action, idempotency_key)
         values ($1, $2, $3, $4, 'DRAFT_CREATED', $5)`,
        [eventId, passageId, ids.organisationA, ids.userD, `review-${eventId}`],
      );
      const teacherDrafts = await asUser(ids.userA, client => client.query("select id from public.passages where id = $1", [passageId]));
      const stewardDrafts = await asUser(ids.userD, client => client.query("select id from public.passages where id = $1", [passageId]));
      const stewardEvents = await asUser(ids.userD, client => client.query("select id from public.content_review_events where id = $1", [eventId]));
      expect(teacherDrafts.rows).toHaveLength(0);
      expect(stewardDrafts.rows).toHaveLength(1);
      expect(stewardEvents.rows).toHaveLength(1);
      await expect(asUser(ids.userD, client => client.query(
        `insert into public.content_review_events (passage_id, organisation_id, reviewer_id, action, idempotency_key)
         values ($1, $2, $3, 'RIGHTS_CLEARED', $4)`,
        [passageId, ids.organisationA, ids.userD, `blocked-write-${eventId}`],
      ))).rejects.toThrow();

      await admin.query("update public.passages set rights_status = 'CLEARED', safety_status = 'PASSED', approval_status = 'APPROVED', approved_at = now(), approved_by = $2 where id = $1", [passageId, ids.userD]);
      const teacherApproved = await asUser(ids.userA, client => client.query("select id from public.passages where id = $1", [passageId]));
      expect(teacherApproved.rows).toHaveLength(1);
    } finally {
      await admin.query("delete from public.content_review_events where id = $1", [eventId]);
      await admin.query("delete from public.passages where id = $1", [passageId]);
    }
  });
});

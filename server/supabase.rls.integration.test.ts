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
            ($5, 'authenticated', 'authenticated', $6)
     on conflict (id) do nothing`,
    [ids.userA, `${ids.userA}@reader-leader.test`, ids.userB, `${ids.userB}@reader-leader.test`, ids.userC, `${ids.userC}@reader-leader.test`],
  );
  await admin.query(
    `insert into public.organisations (id, name, region)
     values ($1, 'Organisation A', 'IE'), ($2, 'Organisation B', 'IE')`,
    [ids.organisationA, ids.organisationB],
  );
  await admin.query(
    `insert into public.memberships (user_id, organisation_id, role)
     values ($1, $2, 'teacher_set'), ($3, $4, 'guardian'), ($5, $2, 'guardian')`,
    [ids.userA, ids.organisationA, ids.userB, ids.organisationB, ids.userC],
  );
  await admin.query(
    `insert into public.learners (id, organisation_id, display_name, pronunciation_set_id)
     values ($1, $2, 'Fixture learner', 'ie-default')`,
    [ids.learnerA, ids.organisationA],
  );
  await admin.query(
    `insert into public.passages (id, organisation_id, title, body, approval_status, rights_status, safety_status)
     values ($1, $2, 'Fixture passage', 'The reader leader passage.', 'APPROVED', 'CLEARED', 'PASSED')`,
    [ids.passageA, ids.organisationA],
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
  await admin.query("delete from auth.users where id in ($1, $2, $3)", [ids.userA, ids.userB, ids.userC]);
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
        `insert into public.human_reviews (agent_decision_id, reviewer_id, override_action, reason)
         values ($1, $2, 'MODEL', 'Human review for integration test')`,
        [ids.decisionA, ids.userA],
      );
    });

    await expect(
      asUser(ids.userB, client =>
        client.query(
          `insert into public.human_reviews (agent_decision_id, reviewer_id, override_action, reason)
           values ($1, $2, 'MODEL', 'Cross-organisation guardian should be rejected')`,
          [ids.decisionA, ids.userB],
        ),
      ),
    ).rejects.toThrow();

    await expect(
      asUser(ids.userC, client =>
        client.query(
          `insert into public.human_reviews (agent_decision_id, reviewer_id, override_action, reason)
           values ($1, $2, 'MODEL', 'Same-organisation guardian should be rejected')`,
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

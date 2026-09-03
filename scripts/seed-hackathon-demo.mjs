import pg from "pg";

const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
const guardianId = "e0000000-0000-4000-8000-000000000001";
const demoTeacherId = process.env.READER_LEADER_DEMO_TEACHER_ID;

try {
  await client.connect();
  const organisation = demoTeacherId
    ? await client.query("select o.id from public.organisations o join public.memberships m on m.organisation_id = o.id where m.user_id = $1::uuid and m.role in ('school_admin', 'literacy_lead', 'teacher_set') order by o.created_at asc limit 1", [demoTeacherId])
    : await client.query("select id from public.organisations where name = 'Reader Leader Demo Academy (Fictional)' order by created_at asc limit 1");
  if (!organisation.rowCount) throw new Error("Fictitious Reader Leader Demo Academy organisation is missing");
  const organisationId = organisation.rows[0].id;
  const learner = await client.query("select id from public.learners where organisation_id = $1 and display_name = 'Ava Reader (Synthetic)' limit 1", [organisationId]);
  const learnerId = learner.rowCount ? learner.rows[0].id : (await client.query(
    "insert into public.learners (organisation_id, display_name, pronunciation_set_id, safe_label) values ($1, 'Ava Reader (Synthetic)', 'synthetic-ie-v1', 'Ava (demo)') returning id",
    [organisationId],
  )).rows[0].id;

  await client.query(
    `insert into auth.users (id, aud, role, email)
     values ($1, 'authenticated', 'authenticated', 'synthetic-guardian@reader-leader.demo.invalid')
     on conflict (id) do nothing`, [guardianId],
  );
  await client.query("insert into public.memberships (user_id, organisation_id, role) values ($1, $2, 'guardian') on conflict do nothing", [guardianId, organisationId]);
  await client.query("insert into public.guardian_learner_links (guardian_id, learner_id, organisation_id, relationship_label) values ($1, $2, $3, 'synthetic hackathon guardian') on conflict do nothing", [guardianId, learnerId, organisationId]);
  await client.query(
    `insert into public.consents (learner_id, guardian_id, purpose, training_opt_in, retention_until, status, consent_text_version, policy_version, idempotency_key)
     select $1::uuid, $2::uuid, 'READING_ASSESSMENT', false, '2030-12-31T23:59:59.000Z', 'ACTIVE', 'hackathon-demo-copy-v1', 'hackathon-demo-policy-v1', 'hackathon-demo-consent-v1-' || ($1::uuid)::text
     where not exists (select 1 from public.consents where learner_id = $1::uuid and guardian_id = $2::uuid and policy_version = 'hackathon-demo-policy-v1')`, [learnerId, guardianId],
  );
  await client.query(
    `insert into public.passages (organisation_id, title, body, version, region_tags, phonics_profile, approval_status, rights_status, safety_status, approved_at, creation_idempotency_key)
     values ($1::uuid, 'Harbour lights — synthetic demo', 'A calm synthetic passage used only to demonstrate the adult workflow. The boats wait by the quiet shore.', 1, array['IE'], '{}'::jsonb, 'APPROVED', 'CLEARED', 'PASSED', now(), 'hackathon-demo-passage-v1-' || ($1::uuid)::text)
     on conflict (organisation_id, creation_idempotency_key) do nothing`, [organisationId],
  );
  console.log(JSON.stringify({ seeded: true, organisationId, learnerId, guardianId, classification: "SYNTHETIC_HACKATHON_DEMO_ONLY" }));
} finally {
  await client.end();
}

import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { processDeletionVerification } from "./reader-leader/consent-lifecycle";

const { Client } = pg;
const databaseUrl = process.env.SUPABASE_DB_URL;
const test = databaseUrl ? it : it.skip;
const ids = {
  guardian: randomUUID(),
  organisation: randomUUID(),
  learner: randomUUID(),
  consent: randomUUID(),
  withdrawal: randomUUID(),
  request: randomUUID(),
  audio: randomUUID(),
  derived: randomUUID(),
};
const audioHash = "c".repeat(64);
const derivedHash = "d".repeat(64);
let admin: pg.Client;

beforeAll(async () => {
  if (!databaseUrl) return;
  admin = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await admin.connect();
  await admin.query(`insert into auth.users (id, aud, role, email) values ($1, 'authenticated', 'authenticated', $2)`, [ids.guardian, `${ids.guardian}@reader-leader.test`]);
  await admin.query(`insert into public.organisations (id, name, region) values ($1, 'Lifecycle Verification School', 'IE')`, [ids.organisation]);
  await admin.query(`insert into public.learners (id, organisation_id, display_name, pronunciation_set_id, safe_label) values ($1, $2, 'Lifecycle fixture', 'ie-default', 'Lifecycle fixture')`, [ids.learner, ids.organisation]);
  await admin.query(`insert into public.guardian_learner_links (guardian_id, learner_id, organisation_id) values ($1, $2, $3)`, [ids.guardian, ids.learner, ids.organisation]);
  await admin.query(`insert into public.consents (id, learner_id, guardian_id, purpose, training_opt_in, retention_until, status, consent_text_version, policy_version, idempotency_key) values ($1, $2, $3, 'READING_ASSESSMENT', false, now() + interval '30 days', 'ACTIVE', 'test-copy-1', 'test-policy-1', $4)`, [ids.consent, ids.learner, ids.guardian, `consent-${ids.consent}`]);
  await admin.query(`insert into public.consent_withdrawals (id, consent_id, learner_id, guardian_id, reason, idempotency_key) values ($1, $2, $3, $4, 'WITHDRAWAL_OF_CONSENT', $5)`, [ids.withdrawal, ids.consent, ids.learner, ids.guardian, `withdraw-${ids.withdrawal}`]);
  await admin.query(`insert into public.data_deletion_requests (id, learner_id, guardian_id, organisation_id, scope, idempotency_key) values ($1, $2, $3, $4, 'AUDIO_AND_DERIVED_DATA', $5)`, [ids.request, ids.learner, ids.guardian, ids.organisation, `delete-${ids.request}`]);
  await admin.query(`insert into public.audio_assets (id, learner_id, organisation_id, storage_object_hash, sha256, retention_until) values ($1, $2, $3, $4, $5, now() + interval '30 days')`, [ids.audio, ids.learner, ids.organisation, audioHash, audioHash]);
  await admin.query(`insert into public.derived_data_assets (id, learner_id, organisation_id, source_audio_asset_id, asset_kind, storage_object_hash, retention_until) values ($1, $2, $3, $4, 'ALIGNMENT', $5, now() + interval '30 days')`, [ids.derived, ids.learner, ids.organisation, ids.audio, derivedHash]);
}, 30_000);

afterAll(async () => {
  if (!admin) return;
  await admin.query("delete from public.data_lifecycle_audit_events where learner_id = $1", [ids.learner]);
  await admin.query("delete from public.data_deletion_receipts where request_id = $1", [ids.request]);
  await admin.query("delete from public.derived_data_assets where id = $1", [ids.derived]);
  await admin.query("delete from public.audio_assets where id = $1", [ids.audio]);
  await admin.query("delete from public.data_deletion_requests where id = $1", [ids.request]);
  await admin.query("delete from public.consent_withdrawals where id = $1", [ids.withdrawal]);
  await admin.query("delete from public.consents where id = $1", [ids.consent]);
  await admin.query("delete from public.guardian_learner_links where guardian_id = $1 and learner_id = $2", [ids.guardian, ids.learner]);
  await admin.query("delete from public.learners where id = $1", [ids.learner]);
  await admin.query("delete from public.organisations where id = $1", [ids.organisation]);
  await admin.query("delete from auth.users where id = $1", [ids.guardian]);
  await admin.end();
}, 30_000);

describe("Priority 1 deletion verification", () => {
  test("records verified deletion receipts and blocks the lifecycle inventory from further processing", async () => {
    const executed: string[] = [];
    const result = await processDeletionVerification(ids.request, {
      deleteAudioAsset: async asset => { executed.push(`audio:${asset.id}`); return "DELETED"; },
      deleteDerivedData: async asset => { executed.push(`derived:${asset.id}`); return "DELETED"; },
    });
    expect(result.status).toBe("COMPLETED");
    expect(executed).toEqual([`audio:${ids.audio}`, `derived:${ids.derived}`]);

    const [request, audio, derived, receipts, audit] = await Promise.all([
      admin.query("select status, completed_at from public.data_deletion_requests where id = $1", [ids.request]),
      admin.query("select deleted_at, deletion_request_id from public.audio_assets where id = $1", [ids.audio]),
      admin.query("select deleted_at, deletion_request_id from public.derived_data_assets where id = $1", [ids.derived]),
      admin.query("select target_kind, outcome from public.data_deletion_receipts where request_id = $1 order by target_kind", [ids.request]),
      admin.query("select action from public.data_lifecycle_audit_events where deletion_request_id = $1 order by action", [ids.request]),
    ]);
    expect(request.rows[0]).toMatchObject({ status: "COMPLETED" });
    expect(request.rows[0]?.completed_at).not.toBeNull();
    expect(audio.rows[0]).toMatchObject({ deletion_request_id: ids.request });
    expect(audio.rows[0]?.deleted_at).not.toBeNull();
    expect(derived.rows[0]).toMatchObject({ deletion_request_id: ids.request });
    expect(derived.rows[0]?.deleted_at).not.toBeNull();
    expect(receipts.rows).toEqual([{ target_kind: "AUDIO_ASSET", outcome: "DELETED" }, { target_kind: "DERIVED_DATA", outcome: "DELETED" }]);
    expect(audit.rows.map(row => row.action)).toEqual(["AUDIO_DELETION_VERIFIED", "DERIVED_DATA_DELETION_VERIFIED"]);
  });
});

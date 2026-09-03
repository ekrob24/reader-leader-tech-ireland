import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) throw new Error("SUPABASE_DB_URL is required");

const supportedMigrations = new Set([
  "20260901000000_reader_leader_s1_s3.sql",
  "20260902000000_reader_leader_s7_override_idempotency.sql",
  "20260903000000_reader_leader_safety_timeline.sql",
  "20260904000000_reader_leader_actor_links.sql",
  "20260905000000_reader_leader_consent_lifecycle.sql",
  "20260906000000_reader_leader_atomic_consent_lifecycle.sql",
  "20260907000000_reader_leader_private_storage_and_content_review.sql",
  "20260908000000_reader_leader_content_review_idempotency.sql",
  "20260909000000_reader_leader_passage_selection_rls.sql",
  "20260910000000_reader_leader_hackathon_session_demo.sql",
  "20260911000000_reader_leader_hackathon_demo_reset.sql",
  "20260912000000_reader_leader_synthetic_child_journey.sql",
  "20260913000000_reader_leader_teacher_alert_acknowledgements.sql",
]);
const migrationName = process.argv[2] ?? "20260905000000_reader_leader_consent_lifecycle.sql";
if (!supportedMigrations.has(migrationName)) throw new Error("Unsupported Supabase migration name");

const migrationPath = new URL(`../supabase/migrations/${migrationName}`, import.meta.url);
const migration = await readFile(migrationPath, "utf8");
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

await client.connect();
try {
  await client.query(migration);
  console.log(`Applied Reader Leader Supabase migration: ${migrationName}`);
} finally {
  await client.end();
}

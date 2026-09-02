import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
const migration = await readFile(new URL("../supabase/migrations/20260902000000_reader_leader_s7_override_idempotency.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(migration);
  console.log("Applied Reader Leader S7 override migration successfully.");
} finally {
  await client.end();
}

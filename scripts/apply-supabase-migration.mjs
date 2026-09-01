import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) throw new Error("SUPABASE_DB_URL is required");

const migrationPath = new URL("../supabase/migrations/20260901000000_reader_leader_s1_s3.sql", import.meta.url);
const migration = await readFile(migrationPath, "utf8");
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

await client.connect();
try {
  await client.query(migration);
  console.log("Applied Reader Leader Supabase migration successfully.");
} finally {
  await client.end();
}

import fs from "node:fs/promises";
import pg from "pg";

const sql = await fs.readFile(new URL("../supabase/migrations/20260903000000_reader_leader_safety_timeline.sql", import.meta.url), "utf8");
const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try { await client.query(sql); console.log("Learner-safety timeline migration applied"); } finally { await client.end(); }

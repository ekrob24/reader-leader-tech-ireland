import fs from "node:fs/promises";
import pg from "pg";
const sql = await fs.readFile(new URL("../supabase/migrations/20260904000000_reader_leader_actor_links.sql", import.meta.url), "utf8");
if (!process.env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL is required");
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try { await client.query(sql); console.log("Reader Leader actor-link migration applied"); } finally { await client.end(); }

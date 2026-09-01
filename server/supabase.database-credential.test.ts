import { describe, expect, it } from "vitest";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.SUPABASE_DB_URL;

describe("Supabase database configuration", () => {
  const test = databaseUrl ? it : it.skip;

  test("authenticates the configured PostgreSQL connection", async () => {
    expect(databaseUrl).toMatch(/^postgres(?:ql):\/\//);

    const client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10_000,
    });

    await client.connect();
    try {
      const result = await client.query<{ ok: number }>("select 1 as ok");
      expect(result.rows[0]?.ok).toBe(1);
    } finally {
      await client.end();
    }
  }, 20_000);
});

import pg from "pg";

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) throw new Error("SUPABASE_DB_URL is required");

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(`
    drop policy if exists human_review_insert on public.human_reviews;
    create policy human_review_insert on public.human_reviews for insert with check (
      reviewer_id = auth.uid() and exists (
        select 1 from public.agent_decisions d
        join public.reading_sessions s on s.id = d.session_id
        where d.id = agent_decision_id
          and public.has_role(s.organisation_id, array['school_admin','literacy_lead','teacher_set']::public.app_role[])
      )
    );
  `);
  console.log("Applied role-aware human review RLS policy.");
} finally {
  await client.end();
}

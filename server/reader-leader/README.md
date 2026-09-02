# Reader Leader Supabase Types

`supabase.generated.ts` provides the typed `Database` generic used by the Reader Leader Supabase clients. It covers the tables, enums, columns, and insert/update shapes defined in `supabase/migrations/` and turns invalid table or column references in persistence code into TypeScript errors.

For a release where a Supabase personal access token is available, regenerate the public-schema declarations from the linked project and review the resulting diff before committing it:

```bash
npx supabase gen types typescript --project-id qpvzzrgofxregccverfr --schema public > server/reader-leader/supabase.generated.ts
```

The current declaration was derived from the checked-in migrations because the sandbox does not have a Supabase personal access token and cannot run the CLI's Docker-dependent direct-database inspection. Do not add tokens or database credentials to this repository. Any migration that changes a table or enum must update or regenerate this file in the same change.

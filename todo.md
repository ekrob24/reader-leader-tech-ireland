# Reader Leader TODO

## Scope: Stories S1–S3 only

- [x] Inspect the attached Reader Leader specification and build guide; record the exact S1–S3 entities, acceptance criteria, and out-of-scope boundaries.
- [x] Define shared Zod contracts for S1–S3 inputs, entities, validation boundaries, and outputs.
- [x] Add the Supabase/PostgreSQL migration for the S1–S3 domain tables, indexes, constraints, and timestamps.
- [x] Add row-level security policies enforcing the S1–S3 scoped data-access rules.
- [x] Create deterministic S1–S3 fixture evidence data and a repeatable loader with validation.
- [x] Implement the S1–S3 domain behavior required by the acceptance criteria without adding live speech, child-facing UI, or additional agents.
- [x] Add Vitest coverage for contracts, fixture loading, story behavior, and RLS-related data boundaries.
- [x] Verify the Supabase migration structure and RLS data boundaries through deterministic tests; direct application is intentionally not attempted because the scaffold database is MySQL/TiDB while this artifact targets Supabase PostgreSQL.
- [x] Run TypeScript type checking.
- [x] Run the complete Vitest suite.
- [x] Record and resolve discovered bugs; preserve any remaining known issues here.

## Out of scope

- Live speech or speech-to-text.
- Child-facing UI.
- Additional agents beyond the bounded S5 Judgement Agent scope.
- Stories after S3.

## Confirmed implementation boundary

The authoritative vertical-slice specification defines S1 as typed contracts, S2 as the Supabase foundation with core tables, enums, indexes, RLS, and append-only audit, and S3 as loading a gold-pack case into an immutable evidence bundle with confidence components. The implementation will not include S4–S8 behavior, live speech, child-facing UI, or additional agents.
- [x] Fix S3 malformed-fixture test to mutate a field that the fixture contract actually validates (`goldAction`, not an ignored extra field).
- [x] Add behavioral RLS boundary tests simulating two organisations and multiple roles for sessions, evidence, decisions, reviews, and audit records.
- [x] Add deterministic append-only boundary tests for evidence bundles, agent decisions, human reviews, and audit events, or narrow claims if runtime SQL execution remains unavailable.

## Expansion: Stories S4–S6 and Supabase integration

- [x] Inspect and configure the available Supabase connection for migration execution and integration tests.
- [x] Add two-organisation Supabase RLS integration tests covering tenant isolation, roles, reviews, and append-only records.
- [x] Define S4 pronunciation-context Zod contracts and deterministic lexicon-backed classification.
- [x] Implement S5 bounded judgement with structured output parsing, pinned metadata, and safe fallback.
- [x] Implement S6 deterministic fail-closed policy validation for confidence, regional variants, self-correction, patience, and escalation.
- [x] Add Vitest coverage for S4–S6 behavior and Supabase integration boundaries.
- [x] Re-run TypeScript checking and the complete Vitest suite after live Supabase integration (29 passed across 5 files).
- [x] Save a new checkpoint after the Supabase pooler integration is verified.
- [x] Fix S4 null observed-form classification and S6 test fixtures/expectations revealed by verification.

## Supabase server configuration follow-up

- [x] Install and evaluate the requested Supabase server package for compatibility with this Express/tRPC scaffold.
- [x] Add the complete Supabase secret key securely; do not use the redacted value from chat.
- [x] Add and validate server-side Supabase URL, publishable key, secret key, and JWKS configuration.
- [x] Re-attempt migration application and two-organisation RLS integration tests using the exact Supabase Session pooler connection.
- [x] Use the Supabase Session pooler URI for direct PostgreSQL credential and RLS integration; the default `db.<project-ref>.supabase.co` hostname is not resolvable in this sandbox.
- [x] Add live Supabase integration tests using the Session pooler/Postgres connection string for migration application, two-organisation tenant isolation, reviewer ownership, and append-only behavior.
- [x] Replace the skipped database connectivity check with a non-skipped setup/teardown path once `SUPABASE_DB_URL` or the pooler URI is available.
- [x] Fix live RLS audit test setup: audit rows are intentionally server-write-only, so seed the audit record with the privileged connection and test authenticated read isolation separately.
- [x] Align live audit RLS assertions with the migration’s intentional server-only audit access: authenticated clients must be denied even when actor IDs match.
- [x] Add a distinct guardian role to the live RLS fixture and enforce/assert role-specific human-review permissions alongside tenant isolation.
- [x] Prove role-specific denial with a guardian in the same organisation as the decision, alongside the existing cross-organisation guardian check.
- [x] Save a fresh checkpoint after the final Supabase pooler migration, live RLS integration tests, and 29-test verification run complete.

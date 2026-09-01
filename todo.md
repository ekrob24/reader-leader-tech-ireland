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
- Additional agents beyond the S1–S3 scope.
- Stories after S3.

## Confirmed implementation boundary

The authoritative vertical-slice specification defines S1 as typed contracts, S2 as the Supabase foundation with core tables, enums, indexes, RLS, and append-only audit, and S3 as loading a gold-pack case into an immutable evidence bundle with confidence components. The implementation will not include S4–S8 behavior, live speech, child-facing UI, or additional agents.
- [x] Fix S3 malformed-fixture test to mutate a field that the fixture contract actually validates (`goldAction`, not an ignored extra field).
- [x] Add behavioral RLS boundary tests simulating two organisations and multiple roles for sessions, evidence, decisions, reviews, and audit records.
- [x] Add deterministic append-only boundary tests for evidence bundles, agent decisions, human reviews, and audit events, or narrow claims if runtime SQL execution remains unavailable.

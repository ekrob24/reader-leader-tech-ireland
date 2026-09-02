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
- Standalone child-facing production UI; only the teacher-safe child-feedback preview is included.
- Additional agents beyond the bounded S5 Judgement Agent scope.
- Stories after S8.

## Confirmed implementation boundary

The authoritative vertical-slice specification defines S1–S8 contracts, evidence, policy, safe surfaces, overrides, and evaluation. Standalone child-facing production UI, live speech, and additional agents remain excluded.
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

## Expansion: Stories S7–S8 and UI resilience

- [x] Read the authoritative S7–S8 specification and confirm teacher-safe, child-safe, append-only, evaluation, and regression-gate boundaries.
- [x] Define shared Zod contracts for S7 teacher summaries, child-safe prompts, append-only overrides, S8 metrics, and regression results.
- [x] Implement S7 teacher-facing summaries and child-safe prompt projection without live speech or unsafe content exposure.
- [x] Implement append-only override persistence and RLS policies for authorised teacher/admin reviewers.
- [x] Implement S8 gold-pack evaluation metrics and deterministic regression gates with explicit thresholds.
- [x] Add Vitest coverage for S7–S8 contracts, behavior, persistence boundaries, metrics, and gates.
- [x] Enhance the existing UI with polished loading animations, skeleton states, and actionable error handling.
- [x] Run TypeScript checking, the complete Vitest suite, and browser-level UI verification (42 tests passed across 8 files; final rerun clean).
- [x] Save a fresh checkpoint after S7–S8 verification.
- [x] Fix S7 teacher-briefing evidence-reference deduplication for the project’s TypeScript target.
- [x] Add the S8 override marker to the validated evaluation-case contract so override-rate metrics remain type-safe.
- [x] Update live human-review integration fixtures to supply S7 idempotency keys and verify duplicate override rejection.
- [x] Fix S7 empty silent-template validation and S7 duplicate override test transaction scope revealed by the full suite.
- [x] Add a server-side append-only override persistence helper and protected tRPC mutation with role and tenant checks.
- [x] Wire the teacher evidence desk to submit persisted-session overrides with loading, success, and error states; fixture preview remains explicitly disabled.
- [x] Add Vitest coverage for application-layer override persistence, idempotency, and unauthorised-role rejection.
- [x] Make override persistence tenant-aware by resolving the decision organisation and verifying the authenticated Reader Leader membership role before insert.
- [x] Return a real persisted decision identifier and authenticated reviewer identity for persisted-session override flows; fixture preview remains explicitly non-submitting.
- [x] Add application-layer duplicate idempotency-key failure coverage with the expected error shape.
- [x] Derive Reader Leader reviewer roles from Supabase memberships instead of scaffold admin/user roles in the override mutation.
- [x] Add a protected persisted-decision query returning a real agent decision id and reviewer context.
- [x] Add router-level tests proving authorised teacher mutation success and cross-tenant/non-member rejection.
- [x] Make reviewer-role resolution organisation-aware for the target decision rather than selecting an arbitrary first membership.
- [x] Add router-level cross-tenant override rejection where the reviewer belongs to a different organisation.
- [x] Add router-level coverage for persisted-decision query membership and tenant boundaries.
- [x] Add persisted-decision rejection coverage when reviewer membership exists only in a different organisation, then rerun final verification.

## Bug fix: duplicate navigation key

- [x] Fix duplicate React key warning caused by two dashboard navigation items sharing the `/` path key.
- [x] Verify TypeScript, complete Vitest suite, and browser console show no duplicate-key warning; the post-fix console window is clean.
- [x] Save a checkpoint containing the verified fix.
- [x] Add a deterministic navigation regression test asserting dashboard item keys are unique and rerun final verification.
- [x] Save a new checkpoint after the duplicate-navigation-key fix and deterministic regression test are complete.

## Investigation: recurring duplicate navigation key warning

- [x] Re-trace all rendered navigation/list key expressions and identify any remaining `/` key source; current dashboard navigation renders `key={item.id}` with unique IDs.
- [x] Compare current source, built client output, HMR state, and browser-console timestamps to determine whether the warning is stale or emitted by another component; recorded `/` warnings predate the fix and no post-fix warning was found.
- [x] Record the next incomplete implementation work and recommended remediation path; no incomplete implementation items remain in todo.md, and the next practical work is authenticated end-to-end QA plus product follow-through.
- [x] Inspect the production build output for duplicate navigation-key code and narrow the warning conclusion if the build artifact is unavailable; build succeeded, obsolete key pattern matches are zero, and current IDs are present.

## Feature: learner safety route and authenticated navigation

- [x] Inspect current auth, routing, Supabase membership, and browser-test setup.
- [x] Define role-based learner-safety permissions and safe content boundaries.
- [x] Add protected learner-safety server procedures and route data.
- [x] Build a learner-safety page that clearly separates teacher controls from child-safe views.
- [x] Add loading, empty, forbidden, and error states for learner safety.
- [x] Add authenticated Playwright end-to-end tests for navigation, routing, and role permissions.
- [x] Run TypeScript, all Vitest tests, Playwright tests, and browser verification.
- [x] Save a checkpoint after verification.

## Learner safety route UI and E2E coverage

- [x] Inspect current route, auth, permission, and browser-test setup.
- [x] Define learner-safety role boundaries for teacher controls and child-safe views.
- [x] Implement the authenticated learner-safety route and protected server data.
- [x] Build a visually distinct teacher-controls panel and child-facing-safe view panel.
- [x] Add loading, forbidden, and error states for learner safety.
- [x] Install/configure Playwright and add authenticated navigation and role-permission tests.
- [x] Run TypeScript, all Vitest tests, Playwright tests, and browser verification.
- [x] Save a checkpoint after verification.
- [x] Fix Playwright learner-safety E2E response mocking or route rendering failure; tests reach `/learner-safety` but do not see the page heading.
- [x] Fix Playwright batched tRPC interception so combined auth and learner-safety/preview queries return responses in the correct order.
- [x] Add a distinct learner-safety empty state and separate forbidden access from generic load failure.
- [x] Add Playwright coverage for forbidden and empty learner-safety states.
- [x] Run explicit browser verification of the learner-safety route and record the result; Playwright verifies the unauthenticated OAuth redirect, teacher/viewer routing, forbidden state, and empty state.
- [x] Save a checkpoint after learner-safety implementation and verification.
- [x] Fix forbidden-state detection so a structured or message-level permission denial renders the restricted state in end-to-end tests.
- [x] Add Playwright coverage for unauthenticated learner-safety behavior and narrow the verification note to evidence-backed assertions.
- [x] Update unauthenticated Playwright coverage to assert the existing Manus OAuth redirect rather than an in-page sign-in heading.
- [x] Narrow the learner-safety verification note to only evidence-backed Playwright results: OAuth redirect, teacher/viewer routing, forbidden state, and empty state.

## Learner safety persistence and child progress

- [x] Re-read full-stack guidance and inspect existing learner-safety, schema, Supabase, and test files.
- [x] Define Zod contracts for learners, selected learner context, decision timeline, audit history, and override reversal events.
- [x] Add persisted learner selection and protected learner-scoped timeline procedures.
- [x] Add teacher-only audit history and append-only reversal framework for overrides.
- [x] Enhance child-safe view with interactive visual feedback and progress indicators.
- [x] Add Vitest, Supabase integration, and Playwright coverage for the new flows.
- [x] Run TypeScript, complete Vitest, Playwright, and browser verification.
- [x] Save a checkpoint after verification.
- [x] Update learner-safety Playwright teacher assertion for the new “Reverse an override” control label and rerun persistence-flow verification.
- [x] Update the live Supabase learner fixture to provide `safe_label` after the learner-safety migration made it required.
- [x] Extend Playwright coverage for learner selection, persisted decision timeline, teacher audit history, reversible override controls, and interactive child progress.
- [x] Update Playwright timeline and audit assertions to use rendered text selectors because the shared CardTitle component does not expose semantic heading roles in this page.
- [x] Make unauthenticated Playwright coverage assert the actual `/app-auth` OAuth request emitted by `startLogin`, which is more reliable than waiting on an external URL.
- [x] Tighten ChildProgress validation so progress steps cannot exceed total and completion state remains consistent with the displayed indicator.
- [x] Execute the reverse-override Playwright flow and assert authorised teacher success plus non-manager denial/read-only behavior.
- [x] Save a fresh checkpoint containing the learner-safety persistence, actor-link migration, live integration, and final verification changes.
- [x] Execute the teacher reversal control in Playwright and assert the append-only success status, then rerun all checks.
- [x] Assert in Playwright that viewer/non-manager users cannot execute or see the append-only reversal control while teachers can.

## Tracker reconciliation and learner-safety follow-ups

- [x] Reconcile previously completed learner-safety items so todo.md matches the current implementation and verification evidence.
- [x] Add a learner switcher backed by the teacher’s real roster and server-backed pagination for long timelines.
- [x] Add a confirmation dialog and required reason field before reversing an override.
- [x] Add CI Playwright execution against deterministic seeded organisation fixtures (mocked tRPC boundary; no live credentials in CI).
- [x] Re-run TypeScript, Vitest, Playwright, and browser verification after the follow-ups: 47 Vitest tests and 6 Playwright tests pass.
- [ ] Save a fresh checkpoint containing the reconciled tracker and follow-up implementation.
- [x] Update Playwright reversal coverage for the new confirmation dialog and required reason field, then rerun E2E verification.

## Follow-up verification corrections

- [x] Wire the learner-safety page to the protected paginated timeline query and add multi-page server-backed tests.
- [x] Add real seeded-organisation setup for CI Playwright, or narrow the CI claim to deterministic mocked E2E coverage; CI is explicitly configured for deterministic mocked organisation fixtures.
- [x] Perform and record browser verification after the follow-up UI changes through the passing Playwright suite.

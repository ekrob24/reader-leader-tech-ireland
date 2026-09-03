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
- [x] Save a fresh checkpoint containing the reconciled tracker and follow-up implementation.
- [x] Update Playwright reversal coverage for the new confirmation dialog and required reason field, then rerun E2E verification.

## Follow-up verification corrections

- [x] Wire the learner-safety page to the protected paginated timeline query and add multi-page server-backed tests.
- [x] Add real seeded-organisation setup for CI Playwright, or narrow the CI claim to deterministic mocked E2E coverage; CI is explicitly configured for deterministic mocked organisation fixtures.
- [x] Perform and record browser verification after the follow-up UI changes through the passing Playwright suite.

## Bug fix: invalid Supabase URL on learner safety

- [x] Inspect runtime Supabase URL resolution and deployment secret mapping.
- [x] Add strict HTTP/HTTPS URL validation at the server client boundary.
- [x] Make learner-safety surface configuration failures actionable and non-crashing.
- [x] Add regression coverage for missing, malformed, and valid Supabase URLs.
- [x] Run TypeScript, complete Vitest, and affected-route/browser verification: 48 Vitest tests and 7 Playwright tests pass.
- [x] Save a checkpoint after verification.
- [x] Add a focused learner-safety configuration-error test proving malformed Supabase config becomes a non-crashing actionable state.
- [x] Run an authenticated Playwright learner-safety check after the URL fix and assert the invalid-URL error is absent.

## Bug fix: authenticated Supabase URL still unavailable

- [x] Inspect project/deployment configuration and runtime environment names for Supabase URL injection.
- [x] Repair the server URL resolution path so the authenticated learner-safety route can construct a valid client in managed runtime.
- [x] Add authenticated route regression coverage for valid configuration and actionable malformed-configuration behavior.
- [x] Run TypeScript, complete Vitest, Playwright, and authenticated route verification: 48 Vitest tests and 7 Playwright tests pass.
- [x] Save a checkpoint after verification.
- [x] Add a public Supabase project URL fallback for this configured Reader Leader project when managed runtime variables contain an invalid placeholder, and verify the authenticated route no longer emits the URL exception.

## Bug fix: authenticated actor is not linked to Supabase

- [x] Inspect actor-link migration, lookup helper, and the current authenticated Manus identity.
- [x] Add a safe actor-link resolution path for existing Supabase identities without weakening tenant or role checks.
- [x] Make missing-link behavior actionable and non-crashing in learner safety.
- [x] Add regression coverage for linked and unlinked actors, including the current admin identity, through the actor-link and live RLS verification paths.
- [x] Run TypeScript, complete Vitest, Playwright, and authenticated route verification.
- [x] Save a checkpoint after verification; consolidated in the final mock-data/actor-link checkpoint.
- [x] Update learner-safety router procedures to pass the full authenticated actor object required by actor-link resolution, then rerun type checking.

## Approved option B: Supabase shadow-user provisioning

- [x] Provisioning superseded: an existing confirmed Supabase Auth UID was supplied and verified instead of creating a shadow user.
- [x] Persist the Manus-to-Supabase actor link and verify the target organisation membership and role.
- [x] Verify first-login/linking behavior through the actor-link resolver and learner-safety access coverage.
- [x] Run TypeScript, complete Vitest, Playwright, and authenticated route verification.
- [x] Save a checkpoint after provisioning and verification; consolidated in the final mock-data/actor-link checkpoint.

## Supabase actor-link UID supplied

- [x] Verify the supplied Supabase Auth UID exists and belongs to the intended account.
- [x] Persist the current Manus actor mapping to the supplied Supabase Auth UID.
- [x] Verify organisation membership and learner-safety access after linking.
- [x] Run TypeScript, complete Vitest, Playwright, and authenticated route verification.
- [x] Save a checkpoint after verification; consolidated in the final mock-data/actor-link checkpoint.
- [x] Resolve the supplied Supabase user’s missing Reader Leader organisation membership; do not assign an organisation or role without user confirmation; assigned the explicitly requested fictitious demo organisation as `school_admin`.

## Mock organisation fixture

- [x] Inspect the existing organisation, membership, learner, and actor-link schema.
- [x] Create an explicitly fictitious organisation and teacher membership for the supplied Supabase user.
- [x] Add clearly labelled fictitious learner, timeline, and audit fixture records if required by the route.
- [x] Verify learner-safety access and role-based teacher controls against the mock data.
- [x] Run relevant tests and save a checkpoint documenting the mock-data boundary.

## Bug fix: learner row contract mapping

- [x] Map Supabase learner rows from snake_case columns to the shared camelCase LearnerRecord contract.
- [x] Add regression coverage for learner list and selected learner parsing.
- [x] Run TypeScript, complete Vitest, Playwright, and learner-safety route verification: 50 Vitest tests and 7 Playwright tests pass.
- [x] Save a checkpoint after verification.

## Bug fix: learner-safety timeline contract normalization

- [x] Normalize timeline rows from Supabase snake_case fields and database timestamp formats into the shared timeline contract.
- [x] Add regression coverage for missing learnerId mapping and ISO datetime normalization.
- [x] Run TypeScript, complete Vitest, Playwright, and browser-console verification; route renders and the reported Zod failure is absent from the verification run.
- [x] Save a checkpoint after verification.

## Contract safety, resilience, and build-status reconciliation

- [x] Add typed Supabase database row definitions and use them at Reader Leader persistence boundaries.
- [x] Add a safe, actionable learner-safety UI state for malformed or incomplete timeline records.
- [x] Add structured, privacy-preserving server logging for contract-boundary failures.
- [x] Reconcile `todo.md` presentation and document the current build status, completed scope, and next priorities.
- [x] Add regression tests and run TypeScript, Vitest, Playwright, and visual verification: 53 Vitest tests and 8 Playwright tests pass.
- [x] Save a checkpoint after verification.

## Priority 1: consent and data-lifecycle controls

- [x] Inspect current consent, audit, retention, storage, and tenancy boundaries.
- [x] Define shared Zod contracts for guardian consent, withdrawal, retention state, deletion requests, deletion receipts, and audit events.
- [x] Add the Supabase migration and generated-style typed schema updates for consent, deletion, audio assets, derived data, and append-only audit records.
- [x] Add RLS policies that restrict guardian consent and withdrawal actions to the linked guardian, preserve tenant boundaries, and prohibit client audit mutation.
- [x] Add protected tRPC procedures for recording guardian consent, recording withdrawal, requesting deletion, and viewing safe deletion status.
- [x] Add automated tests for withdrawal blocks, retention eligibility, deletion receipts, audit append-only behavior, RLS, and safe error states.
- [x] Run TypeScript, complete Vitest, Playwright, migration verification, and browser verification: 60 Vitest tests and 8 Playwright tests pass.
- [x] Document the Priority 1 implementation boundary and save a checkpoint.

## Private data lifecycle execution and approved-passage workflow

- [x] Inspect existing storage helpers, passage schema, consent lifecycle, auth roles, and reusable UI components.
- [x] Add consent-aware private storage inventory and a server-side deletion executor that emits verifiable receipts.
- [x] Add schema/contracts/RLS for passage draft, review, approval, and safe approved-passage selection.
- [x] Add protected tRPC procedures for content-steward review actions, teacher approved-passage selection, and lifecycle status.
- [x] Build adult-facing content approval and approved-passage selection interfaces with loading, empty, forbidden, and error states.
- [x] Add unit, live Supabase RLS, storage-executor, router, and Playwright coverage for lifecycle and approval flows.
- [x] Run TypeScript, complete Vitest, Playwright, live migration verification, and browser verification: 66 Vitest tests and 9 Playwright tests pass.
- [x] Document the expanded MVP boundary and save a checkpoint.

## Consent-gated sessions, durable lifecycle, and analysis operations

- [x] Scoped for hackathon: inspect storage capabilities, session and consent boundaries, existing background infrastructure, alerting hooks, and relevant skills.
- [x] Scoped for hackathon: define contracts for consent-gated mock sessions, bounded upload metadata, durable mock jobs, retries, and safe traces. Production alert-delivery contracts remain deferred.
- [x] Scoped for hackathon: add mock-only migrations and typed schemas for sessions, upload metadata, jobs, retries, and traces. Physical-deletion and alert tables remain deferred until a delete-capable provider is available.
- [x] Scoped for hackathon: implement consent-aware sessions and metadata-only mock upload; no audio bytes are accepted or stored.
- [x] Deferred by the user’s no-cost hackathon constraint: provider-backed physical storage deletion, deployed automatic worker execution, and external alert delivery. The design/runbook is retained for later implementation.
- [x] Scoped for hackathon: build an adult-facing session dashboard with blocked, queued, analysing, ready, and safe trace states.
- [x] Scoped for hackathon: write mock operations, replay, retry, deletion-boundary, and alert-checklist runbooks.
- [x] Scoped for hackathon: add contract, live RLS, integration, and Playwright coverage; automated worker and external alert tests remain deferred with the production infrastructure.
- [x] Scoped for hackathon: document the mock-only MVP boundary and save the verified checkpoint.

## Hackathon-safe session and analysis demonstration

- [x] Inspect existing session, consent, content workflow, dashboard, and test boundaries for the hackathon-safe demo.
- [x] Define contracts for consent-gated mock sessions, upload states, durable mock analysis jobs, trace events, and safety-dashboard summaries.
- [x] Add non-production migrations and typed schema updates for mock session/upload/job/trace state without storing audio bytes.
- [x] Implement protected consent-gated session creation, mock upload progression, and deterministic mock analysis traces.
- [x] Build an adult-facing hackathon demo page showing blocked, ready, uploaded, analysing, and reviewed safety states.
- [x] Add workflow guidance in the content approval UI/docs for content steward drafting/review and teacher approved-passage selection.
- [x] Add unit, integration, router, and Playwright coverage; run TypeScript, full tests, and visual verification.
- [x] Document the mock-only boundary, demo script, current build status, and save a checkpoint.

## Hackathon presentation polish: Demo Mode, approval filters, and trace visualization

- [x] Inspect the current session demo, content workflow, chart components, and browser-test setup.
- [x] Add a clearly labelled Demo Mode toggle that populates only synthetic presentation values and can be turned off.
- [x] Add visual passage-review status indicators and filters for actionable pending approval selections.
- [x] Add interactive, accessible visual timeline controls for deterministic mock analysis traces.
- [x] Add Vitest and Playwright coverage for demo mode, filtering, status indicators, and trace timeline behavior.
- [x] Run TypeScript, the full test suites, and desktop/mobile visual verification: 70 Vitest tests and 10 Playwright tests pass.
- [x] Document the presentation controls and save a checkpoint.

## Hackathon presentation controls: reset, guided tour, and trace export

- [x] Inspect mock-session persistence, existing export patterns, and session-demo UI controls.
- [x] Add protected synthetic-session reset and privacy-safe trace-export contracts and services.
- [x] Build a one-click reset control with confirmation and clear synthetic-only scope.
- [x] Build a judge-facing guided tour overlay for consent gating, content approval, and safe analysis traces.
- [x] Add a trace-summary download that excludes learner names, file data, and other identifying information.
- [x] Add unit and Playwright coverage; run TypeScript, full tests, and responsive visual verification: 72 Vitest tests and 10 Playwright tests pass.
- [x] Document the presentation controls and save a checkpoint.

## Product realignment: functional child-reading workflow

- [x] Reconcile the original Reader Leader specification, current build status, and the functional gaps identified by the user.
- [x] Define the intended end-to-end guardian, teacher, child-reader, content, safety, and review experience in plain language.
- [x] Create a staged child-reading delivery plan with functional acceptance criteria, safety gates, and explicit mock-versus-production boundaries.
- [x] Recommend the smallest next build slice that creates a genuinely usable reading journey rather than another presentation control.

## Synthetic reading journey: child canvas, teacher hand-off, and adult mock review

- [x] Inspect session persistence, approved-passage/content workflow, learner safety routes, and mock analysis contracts.
- [x] Define contracts for teacher-launched child sessions, child-safe completion/help actions, and deterministic mock word-event review records.
- [x] Add schema, typed model, RLS, and protected procedures for child session launch/completion and adult review retrieval.
- [x] Build an isolated child-safe reading canvas with adjustable reading settings, help, and neutral completion states; no microphone or diagnostic content.
- [x] Build teacher launch, child-session link/handoff, and adult review UI with deterministic mock word events and append-only review actions.
- [x] Add unit, RLS, tRPC, and Playwright coverage for child safety, session authorisation, completion, and teacher review.
- [x] Run TypeScript, full tests, migration verification, desktop/mobile browser checks, and save a checkpoint: 75 Vitest tests and 11 Playwright tests pass.

## Reading journey discoverability, session history, and child preferences

- [x] Inspect current session dashboard, launch controls, teacher review routes, child canvas, and browser coverage.
- [x] Add a protected teacher session-history list with learner-safe labels, passage titles, completion/review statuses, and paginated retrieval.
- [x] Make child-session launch and active child links clearly discoverable in the teacher workspace without exposing child tokens in history.
- [x] Add child reading preferences for line spacing and a distraction-free focus mode, preserving accessibility and no-diagnostic safeguards.
- [x] Add unit, router, and Playwright coverage; run TypeScript, full tests, and desktop/mobile visual verification.
- [x] Document the discoverability and child-preference features and save a checkpoint.

## Reading journey usability: launch checklist, review filter, and passage progress

- [x] Inspect the teacher launch controls, session-history view, child reading canvas, and test patterns.
- [x] Add a teacher pre-launch checklist that verifies learner selection, approved passage, active consent, synthetic scope, and safe launch readiness.
- [x] Add a review-ready filter to teacher session history without exposing child tokens or adult-only data outside authorised views.
- [x] Add a child-safe visual passage-progress indicator that tracks local reading position without scoring or diagnostic inference.
- [x] Add unit and Playwright coverage; run TypeScript, full tests, and desktop/mobile visual verification: 78 Vitest tests and 11 Playwright tests pass.
- [x] Document the workflow enhancements and save a checkpoint.

## Reading journey follow-through: completion alerts, bookmarks, and print summary

- [x] Inspect teacher dashboard navigation, session state persistence, child canvas, adult review screen, and test conventions.
- [x] Add privacy-safe teacher completion alert retrieval and a child bookmark boundary that stores only a synthetic session’s local browser position.
- [x] Add a visible teacher completion badge and session-history review link without exposing child session tokens.
- [x] Add local sentence bookmarking and return-to-place controls to the child canvas with no score or behavioural analytics.
- [x] Add a print-focused adult review summary that contains only safe, teacher-authorised mock review content.
- [x] Add unit, router, and Playwright coverage; run TypeScript, full tests, and desktop/mobile visual verification: 78 Vitest tests and 11 Playwright tests pass.
- [x] Document the feature boundaries and save a checkpoint.

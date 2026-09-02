# Reader Leader build status

**Updated:** 2 September 2026

Reader Leader is a **production-shaped vertical-slice prototype** for an accent-aware, adult-governed reading-record workflow. The completed implementation covers the requested S1–S8 bounded decision system and a teacher-safe learner-safety workspace. It is not a live child-reading product and does not process real speech or child data.

> The `Content truncated due to size limit` note seen when viewing `todo.md` is a viewer limit, not text stored in the file. The full tracker remains intact. This document is the concise current-state reference; `todo.md` is the detailed implementation history.

## What is implemented

| Area | Status | Evidence in the project |
|---|---|---|
| S1–S3 foundation | Complete | Shared Zod contracts, Supabase migration/RLS, deterministic fixture loader, unit and live two-organisation RLS tests. |
| S4 pronunciation context | Complete | Lexicon-backed regional-variant classification and contract coverage. |
| S5 bounded judgement | Complete | Structured bounded decision parsing with safe fallback and pinned metadata. |
| S6 deterministic policy | Complete | Fail-closed policy gate for confidence, patience, self-correction, regional variants, and escalation. |
| S7 adult and safe learner surfaces | Complete | Teacher evidence desk, protected learner selector, persisted timeline, append-only override/reversal flow, separate child-safe projection. |
| S8 evaluation | Complete | Gold-pack metrics and deterministic regression gates. |
| Access control and audit | Complete for the prototype | Membership-derived roles, RLS integration coverage, actor-link bridge, tenant checks, append-only override events. |
| Data-contract resilience | Complete | Typed Supabase client generic, snake_case-to-contract normalizers, strict timestamp normalization, privacy-safe boundary logging, actionable malformed-timeline state. |
| Priority 1 consent lifecycle | Complete foundation | Guardian-to-learner authorisation, append-only consent withdrawal, retention eligibility, deletion inventory, receipts, lifecycle audit, and live synthetic-data verification. |
| Private storage lifecycle | Complete access-revocation foundation | Pseudonymous managed-storage keys, hash-only protected inventory, fail-closed verification, key revocation, receipts, and lifecycle audit; physical provider deletion remains a later prerequisite. |
| Content approval and selection | Complete | Adult Content workflow UI, role-derived content-steward review actions, append-only review audit, approval prerequisites, and teacher approved-only selection enforced by RLS. |
| Hackathon session demonstration | Complete, mock-only | Consent-gated session creation, metadata-only mock upload, persisted job states, deterministic safe traces, and adult dashboard; no audio bytes, transcription, or automated worker execution. |

## Current technical boundaries

| Boundary | Current implementation | Not yet included |
|---|---|---|
| Application runtime | React, Vite, Express, tRPC, TypeScript | The separate Next.js/Vercel production migration recommended in the long-term plan. |
| Identity and tenancy | Manus-authenticated actor linked to Supabase Auth identity; Supabase membership/RLS checks | School SSO, OIDC/SAML, invitation workflow, guardian self-service. |
| Decision system | Deterministic evidence, bounded judgement, policy validation, auditability | Live agent run, production prompt tracing, provider monitoring. |
| Speech and audio | Private key and deletion-inventory foundation | Consent-gated browser upload/session creation, physical object deletion/lifecycle policy, alignment, speech-provider adapter, playback. |
| Learner experience | Teacher-owned safe preview only | Production child reading canvas and child account workflow. |
| Data governance | Consent, withdrawal, retention eligibility, deletion requests and receipts, schema/RLS baselines; synthetic data only | Private storage deletion executor, backup restoration, DPIA and operational runbooks. |

## Next work, in priority order

1. **Production audio/session slice:** Replace mock upload metadata with a consent-checked binary-upload path and a provider-backed physical-object deletion or lifecycle policy, using only synthetic or consented staging data.
2. **Durable analysis and observability:** Replace manual mock runs with deployed idempotent background tasks, correlated telemetry, alerting, and a dead-letter/retry process; keep the policy gate as final authority.
3. **Pilot readiness:** Add backup-restoration verification, DPIA and operational runbooks, school onboarding/invites, staging/production separation, and supervised usability testing with literacy and safeguarding experts.

## Verification baseline

The current verified baseline is clean TypeScript checking, **69 Vitest tests**, **10 Playwright tests**, and assertion-backed authenticated browser routes for learner safety, content workflow, and session demo. The test suite includes live two-organisation RLS checks, row-normalization tests, contract-boundary log redaction checks, guardian lifecycle/RLS checks, withdrawal/deletion trigger checks, key-revocation receipt verification, content-review RLS tests, approved-passage selection tests, consent-gate contracts, mock-upload metadata validation, and safe error-state coverage. The direct preview endpoint is unauthenticated and therefore displays its protected-route loading state; authenticated browser behaviour is the assertion-backed E2E baseline.

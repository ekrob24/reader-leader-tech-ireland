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

## Current technical boundaries

| Boundary | Current implementation | Not yet included |
|---|---|---|
| Application runtime | React, Vite, Express, tRPC, TypeScript | The separate Next.js/Vercel production migration recommended in the long-term plan. |
| Identity and tenancy | Manus-authenticated actor linked to Supabase Auth identity; Supabase membership/RLS checks | School SSO, OIDC/SAML, invitation workflow, guardian self-service. |
| Decision system | Deterministic evidence, bounded judgement, policy validation, auditability | Live agent run, production prompt tracing, provider monitoring. |
| Speech and audio | Explicitly excluded | Audio capture, signed private upload, alignment, speech-provider adapter, playback. |
| Learner experience | Teacher-owned safe preview only | Production child reading canvas and child account workflow. |
| Data governance | Schema and RLS baselines; synthetic demo data only | Consent collection, withdrawal, retention/deletion, storage backup restoration, DPIA and operational runbooks. |

## Next work, in priority order

1. **Production trust and governance:** Add consent, guardian withdrawal, retention and deletion verification across database and storage before any real child data is accepted.
2. **Speech workflow behind an adapter:** Implement private audio storage, consent-gated reading-session creation, known-text alignment, and a benchmarked provider adapter using synthetic or consented staging data only.
3. **Durable analysis and observability:** Introduce idempotent background tasks, correlated telemetry, alerting, and a dead-letter/retry process; keep the policy gate as final authority.
4. **Pilot readiness:** Add school onboarding, invited memberships, content stewardship and approval, staging/production separation, and supervised usability testing with literacy and safeguarding experts.

## Verification baseline

The current verified baseline is clean TypeScript checking, **53 Vitest tests**, **8 Playwright tests**, and a rendered authenticated learner-safety route. The test suite includes live two-organisation RLS checks, row-normalization tests, contract-boundary log redaction checks, and a browser flow that verifies the malformed-timeline recovery state. Earlier checkpoint text referenced a higher Vitest count; the current full-suite output above is the authoritative count.

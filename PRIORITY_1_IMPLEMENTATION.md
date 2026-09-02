# Priority 1 implementation: consent and data lifecycle

**Status:** Implemented and verified against the linked Supabase database using synthetic test records only.

> This foundation does **not** enable real child-data collection or audio upload. It introduces the authorisation, consent-state, retention, deletion-inventory, receipt, and audit structures that must exist before the private audio/session slice is built.

## Database updates

The migration `supabase/migrations/20260905000000_reader_leader_consent_lifecycle.sql` adds the following protected model.

| Table | Purpose | Critical controls |
|---|---|---|
| `guardian_learner_links` | Establishes the guardian-to-learner relationship used for authorisation. | Composite primary key; guardian-only RLS read access. |
| `consents` (extended) | Records purpose-specific consent, policy/copy versions, fixed training opt-out, retention date, and status. | Consent status lifecycle; idempotency key; training is constrained to `false`. |
| `consent_withdrawals` | Holds an append-only record of consent withdrawal. | One withdrawal per consent; a trigger changes the linked consent to `WITHDRAWN` in the same transaction. |
| `data_deletion_requests` | Records the guardian's request to delete audio and derived data. | Requires withdrawn consent; trigger sets consent to `PENDING_DELETION`; idempotency key. |
| `audio_assets` | Holds a deletion-verification inventory entry for future private audio storage. | Stores only object hash and file hash—not audio bytes or paths; tracks retention and deletion request. |
| `derived_data_assets` | Holds inventory for future alignment, speech-assessment, and decision-trace outputs. | Separate inventory with source relation, retention, and deletion request tracking. |
| `data_deletion_receipts` | Records each verified deletion outcome. | Append-only receipt keyed by request, target kind, and target hash. |
| `data_lifecycle_audit_events` | Holds a minimised immutable lifecycle audit trail. | Server-only writes; no free-text payloads or sensitive asset locations. |

The applied follow-up migration `20260906000000_reader_leader_atomic_consent_lifecycle.sql` installs two transaction-safe triggers. A withdrawal event immediately sets the consent status to `WITHDRAWN`; a valid deletion request advances it to `PENDING_DELETION`. Both block further processing before a deletion worker is introduced.

## Validation schemas and protected router

The shared module `shared/consent-lifecycle.ts` validates UUIDs, strict UTC timestamps, fixed purposes, fixed deletion scope, idempotency keys, status values, and the mandatory `trainingOptIn: false` default. It rejects expired consent at the input boundary and only allows explicit withdrawal reasons.

| Procedure | Input | Authorisation and outcome |
|---|---|---|
| `consentLifecycle.recordGuardianConsent` | Learner, purpose, copy/policy versions, future retention date, idempotency key. | Confirms the authenticated actor has a guardian-to-learner link; records active consent and audit evidence. |
| `consentLifecycle.withdrawGuardianConsent` | Consent ID, explicit reason, idempotency key. | Confirms guardian ownership; appends withdrawal, atomically blocks processing, and appends audit evidence. |
| `consentLifecycle.requestDataDeletion` | Learner, fixed audio-and-derived-data scope, idempotency key. | Requires guardian link and withdrawn consent; creates a pending deletion request and audit entry. |
| `consentLifecycle.retentionEligibility` | Learner ID. | Returns a safe processing eligibility result for the authenticated linked guardian. |
| `consentLifecycle.deletionStatus` | Deletion request ID. | Returns only the caller's deletion status and redacted hash-based verification receipts. |

`processDeletionVerification` is deliberately **not exposed as a browser procedure**. It is a server-side worker contract that accepts a deletion executor. The next private-storage slice will provide that executor using authenticated, private object deletion and will record the resulting receipts. This maintains separation between guardian requests and privileged deletion execution.

## Automated verification implemented

| Test layer | What is verified |
|---|---|
| Zod contract tests | Future retention is required; training opt-in is always false; unsupported withdrawal/deletion values are rejected; active, withdrawn, expired, and pending-deletion states have correct processing eligibility. |
| tRPC contract tests | Consent defaults safely and malformed/expired consent or unsupported deletion scope is rejected before persistence calls. |
| Live Supabase RLS tests | Only a guardian linked to the learner can see its consent/deletion status and receipts; unrelated guardians see no rows; authenticated clients cannot append lifecycle audit records. |
| Live withdrawal/deletion tests | The append-only withdrawal changes status to `WITHDRAWN`; a deletion request changes it to `PENDING_DELETION`. |
| Deletion-verification integration test | Synthetic audio and derived inventory records receive deletion request links and deletion timestamps; separate `DELETED` receipts and audit events are persisted; request completes only when all executor results succeed. |

## Remaining before live child data

The next priority is the private audio/session slice. It must use private object storage and short-lived signed uploads, write only hashed object references to `audio_assets`, enforce `retentionEligibility.mayProcessData` before issuing any upload/session token, and supply the production deletion executor. Only then can the durable analysis pipeline, provider adapter, retry handling, operational tracing, and deletion-worker schedule be implemented.

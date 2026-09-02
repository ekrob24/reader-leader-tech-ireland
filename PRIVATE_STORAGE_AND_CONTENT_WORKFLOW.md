# Private storage and content workflow

**Status:** Implemented with synthetic test records. Real child-audio capture remains disabled.

## Private storage lifecycle

The server module `server/reader-leader/private-storage-lifecycle.ts` uses the project’s managed private storage adapter. New objects receive pseudonymous paths containing organisation, learner, and asset UUIDs only; names, passage content, and external identifiers are never included in a path. The application stores the returned private object key and SHA-256 hashes in the protected `audio_assets` / `derived_data_assets` inventory, rather than file bytes or browser-accessible URLs.

On a deletion request, `processDeletionVerification` uses the private-storage executor to verify each stored key, clears the active `storage_key`, stamps the inventory item as deleted, and appends a hash-only deletion receipt plus lifecycle audit event. The managed storage adapter does not expose a physical object-delete operation. The result is an **immediate application-access revocation**: there is no longer an active database key or UI reference through which the object can be signed or read. A production storage deletion API or lifecycle policy must be added before making an irreversible physical-deletion claim.

| Control | Implemented behavior |
|---|---|
| Object naming | Pseudonymous UUID-only private key. |
| Privileged access | Storage keys are server-side and are not returned through the guardian lifecycle API. |
| Consent boundary | Withdrawal and deletion-request triggers advance consent to a non-processing state before lifecycle execution. |
| Verification | Each inventory result writes a `DELETED`, `NOT_FOUND`, or `BLOCKED` receipt. `BLOCKED` fails closed. |
| Auditability | Lifecycle audit records contain action/identity references only; no raw audio or object key is written to audit events. |

## Approved-passage workflow

The new **Content workflow** page is accessible from the authenticated dashboard. Content stewards, literacy leads, and school administrators can create a passage draft, independently clear rights and safety, and approve it only after both gates pass. Every action appends a retry-safe `content_review_events` record.

Teachers can select from the approved-passage list but cannot read drafts or the review history. Supabase RLS enforces the same boundary for direct database access: governance roles can read drafts; ordinary organisation roles can read only `APPROVED` passages.

## Verified behavior

The full suite contains 66 Vitest tests and 9 Playwright tests. It includes live Supabase checks that a content steward can read a draft, a teacher cannot read that draft until it is approved, and neither role can write review audit events directly. Browser coverage verifies authenticated navigation to the content workflow and the visual separation between teacher selection and content stewardship.

## Before enabling real child audio

Add a browser-to-server upload path that checks active consent before calling the private storage adapter, add a storage-provider physical deletion/lifecycle policy, then add a durable worker that runs the verified deletion executor and handles retry/dead-letter states. No real child audio should be accepted until all three are verified in staging.

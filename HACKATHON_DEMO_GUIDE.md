# Hackathon demo guide

## Demonstration boundary

The **Session demo** page is designed for the hackathon only. It accepts a local file selection to make the workflow understandable, but sends **only filename, media type, and byte size** to the server. It does not upload, transcribe, retain, or play audio. Use the clearly labelled fictitious Demo Academy records only.

## Suggested four-minute walkthrough

| Step | Screen | What to demonstrate | Safety message |
|---|---|---|---|
| 1 | Content workflow | Create a draft, then use **Clear rights** and **Pass safety**. The **Approve** action appears only after both gates pass. | A teacher cannot select a draft. Every review action is append-only. |
| 2 | Content workflow | Show the approved passage in **Teacher selection** and the new event in **Approval history**. | Teachers receive approved text only; governance roles retain the review queue. |
| 3 | Session demo | Choose the synthetic learner and approved passage, then create a consent-gated mock session. | The server rejects session creation without an active, unexpired guardian consent and an approved same-organisation passage. |
| 4 | Session demo | Pick any local audio file and select **Record mock upload**; then select **Run deterministic mock analysis**. | The page shows file metadata only. No audio bytes leave the browser during this hackathon demonstration. |
| 5 | Session demo | Read the safe trace stages and durable job status. | The trace preserves consent, queue, analysis, and policy-gate evidence without diagnostic content or child metrics. |

## State model

`CREATED → ANALYSING → READY` is the successful mocked session path. Upload metadata moves from `NOT_STARTED → UPLOADED`; mock analysis moves from `QUEUED → RUNNING → READY`. A withdrawn, expired, pending-deletion, or deleted consent blocks the create/upload/run services before state can advance. Retries are capped at three attempts and are intended to be operated by a later durable worker, not an in-process timer.

## Production follow-on

Before replacing mock upload metadata with actual audio, add a provider-backed physical deletion mechanism, a consent-checked binary upload endpoint, and a deployed, idempotent scheduled worker for retries. Keep the existing consent and content-approval gates unchanged.

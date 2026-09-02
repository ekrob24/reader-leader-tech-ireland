# Reader Leader hackathon operations runbook

## Scope and safety boundary

This runbook operates the **mock-only** session demonstration. No real child audio, transcript, or derived speech data is collected. The durable records are session status, metadata-only mock upload status, mock analysis job state, and privacy-safe trace summaries.

## Trace correlation

Each mock analysis job has one immutable `trace_id`. Trace events share that ID and reference the session. Use it to explain the safety path to judges without copying any learner display name, selected file name, or other identifiable value into notes or presentations.

| State | Meaning | Operator action |
|---|---|---|
| `QUEUED` | Mock upload metadata was recorded and awaits the deterministic demo run. | Select **Run deterministic mock analysis** from the Session demo. |
| `RUNNING` | The deterministic demonstration is emitting safe trace stages. | Refresh the page; no second run is needed. |
| `READY` | The safe trace completed and adult review remains the final authority. | Review the trace and, if useful, continue to Learner safety. |
| `FAILED` / `BLOCKED` | A future worker could not complete or the consent gate is no longer valid. | Confirm consent is active; inspect the trace; use a retry only after fixing the cause. |
| `RETRYING` | An authorised adult initiated a bounded retry. | Wait for the worker/demo run to return the job to `READY` or `FAILED`. |

## Manual alert checklist

For the hackathon, alerts are intentionally visible in the dashboard rather than sent to external channels. Investigate when any of the following is non-zero or unexpected:

1. **Blocked sessions:** confirm the session was deliberately stopped because consent is withdrawn, expired, pending deletion, or deleted. Do not override the block.
2. **In-progress jobs:** confirm that the selected session is the synthetic demo and either run the deterministic mock analysis or explain that a deployed worker would claim the job.
3. **Failed/retrying job:** use the trace ID to identify the safe stage where progress stopped. Do not add a child identifier or filename to incident notes.

## Replay procedure

1. Open **Content workflow** and confirm the passage is approved after independent rights and safety gates.
2. Open **Session demo**, select the synthetic learner and approved passage, and create a consent-gated mock session.
3. Record metadata-only mock upload state and run the deterministic mock analysis.
4. Use the trace timeline to confirm `SESSION_CONSENT_CHECKED`, `MOCK_UPLOAD_RECORDED`, `ANALYSIS_QUEUED`, `ANALYSIS_STARTED`, `EVIDENCE_COMPOSED`, `POLICY_GATE_PASSED`, and `ANALYSIS_READY`.
5. If any required stage is missing, stop the demonstration, create a new synthetic session, and record the trace ID only in the incident note.

## Production prerequisites

Do not treat this runbook as a production incident process. Before live sessions, add a deployed idempotent worker, provider-backed physical deletion, alert delivery with an approved recipient/retention policy, failure-rate thresholds, and a privacy-reviewed incident response procedure.

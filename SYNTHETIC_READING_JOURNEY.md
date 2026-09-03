# Synthetic Reading Journey

This is the first end-to-end Reader Leader journey that demonstrates the **actual product shape** without collecting child voice data.

## Demonstration flow

1. An authorised teacher creates a consent-gated synthetic session from **Session demo** using an approved passage.
2. The teacher selects **Launch child reading canvas**. The server verifies staff access, current guardian consent, approved content, and the synthetic-session tag before issuing a 30-minute opaque child link. Only the SHA-256 token hash is stored.
3. The child page at `/read/:token` displays only approved passage text, reading settings, an optional help action, a finish action, and fixed neutral messaging. It does not expose learner identifiers, teacher notes, word events, policy decisions, scores, audio controls, or diagnostic claims.
4. Selecting **I am finished** persists a completed synthetic session and deterministic mock word events. No speech, audio, or transcription is created.
5. The teacher opens **Review completed mock record** to see the adult-only deterministic event cards and suggested bounded actions. Teacher review and override remain in the existing Learner safety workspace.

## Safety controls

| Control | Implementation |
|---|---|
| Child link | Random 32-byte opaque token; database stores a hash only; expires after 30 minutes. |
| Content gate | Child route serves only an `APPROVED` passage from the linked organisation. |
| Consent gate | Token access, start, help, and completion all fail closed if the current assessment consent is no longer active. |
| Scope gate | Child tokens work only for sessions tagged `demo_mode = true`. |
| Data minimisation | The child route returns passage title/body, simple state, help flag, mock-only marker, and approved completion copy only. |
| Adult boundary | Mock word events and teacher notes are queried only through a protected teacher review route. |

## Demo script

Turn on **Demo Mode**, create a session, launch the child reader in a new tab, select **Start reading**, optionally request help, then select **I am finished**. Return to the teacher tab and open the completed review record. Explain that its three event cards are deterministic fixtures used to demonstrate the safe adult workflow—not a statement about a real child’s reading.

## Finding the child session

The child reader is intentionally not a dashboard navigation item because it is opened only from an authorised, time-limited teacher launch. To demonstrate it, open **Session demo**, turn on **Demo Mode**, select the synthetic learner and approved passage, create the session, and choose **Launch child reading canvas**. The generated child link is displayed once for launch and never added to teacher history. The new **Synthetic session history** panel makes prior sessions easy to find through safe learner labels, passage titles, completion state, and review state.

The child reader includes text-size controls, three line-spacing options, and a distraction-free **Focus mode**. These preferences are local visual controls only; they neither record learner data nor affect the adult decision record.

## Teacher readiness and child progress

Before creating a session, **Session demo** now presents a visible checklist for learner selection, adult-approved passage selection, the selected learner’s current consent eligibility, and the mock-only/no-audio boundary. The server independently repeats the consent and approval checks, so the checklist is informative rather than an authorisation substitute.

The session history includes **All sessions** and **Review ready** filters. It displays only a safe learner label, passage title, creation time, completion state, and review state. Child links remain limited to the one-time launch flow.

The child canvas presents a local “Part *n* of *n*” place marker, a visual progress bar, and earlier/next navigation when an approved passage has more than one sentence. It is explicitly described as navigation help, not a score, pace metric, or assessment result.

## Production boundary

This slice is intentionally **not** a live reading assessment. It does not activate a microphone, store bytes, upload audio, call a speech provider, calculate reading metrics, or infer a diagnosis. Those features remain blocked until private storage, physical deletion, provider agreements, durable task infrastructure, and safeguarding approval are complete.

# Reader Leader — Production Development Plan

**Product:** Reader Leader, an accent-aware reading-record agent for Irish literacy teams  
**Architecture target:** Serverless-first production platform with managed identity, managed PostgreSQL, private object storage, durable asynchronous workflows, and bounded agentic AI  
**Prepared:** 1 September 2026

> **Architecture decision.** Build a TypeScript web application on **Next.js App Router**, deploy the web/API surface to **Vercel**, use **Supabase for Auth, PostgreSQL, Row Level Security, Storage, and Realtime**, use **Trigger.dev Cloud for durable long-running analysis tasks**, use **OpenAI Agents SDK for the bounded judgement workflow**, and use **Speechace as the initial production speech-assessment provider behind an adapter interface**. Keep Speechmatics and an open CTC model as benchmark or fallback providers, not as hard-coded dependencies.

This plan turns the two preceding research documents into a production-shaped system. It does not treat the Challenge prototype as disposable. The first release is deliberately narrow, but its contracts, data model, audit trail, consent model, provider abstraction, and evaluation harness are designed so the pilot can become a real school product without a rewrite.

## 1. Product and engineering principles

Reader Leader is not an AI avatar and not an open-ended chatbot. It is a **bounded agentic workflow**. The agent observes a child reading a known passage, combines speech and context evidence, waits long enough to preserve self-correction, chooses one of four actions, records why, and escalates when evidence is weak. The adult remains the authority over interpretation, intervention, and next steps.

The system must optimise for **safe intervention**, not maximum correction. A false correction is more damaging than a missed teaching moment, so the platform treats abstention, uncertainty, and human override as first-class product data. No model may diagnose dyslexia, autonomously change a child’s reading level, or expose an uploaded text to children before rights, safeguarding, and approval gates pass.

| Principle | Engineering consequence |
|---|---|
| AI listens; humans decide | The agent can propose an action and record evidence, but the teacher/SET owns override, interpretation, and intervention status |
| Silence is a valid action | `STAY_SILENT` is a persisted event with a reason, confidence, and evidence—not a missing response |
| Known text beats open dictation | Store passage text and pronunciation lexicon before audio analysis; align against a reference rather than rewriting speech |
| Uncertainty must be visible | Store separate audio, alignment, lexical, pronunciation, and policy confidence values |
| Irish-first, accent-aware | Region and pronunciation-set metadata are required inputs to policy and evaluation |
| Children’s data is minimised | Consent, retention, deletion, private buckets, signed URLs, RLS, and no-training-by-default are architectural controls |
| Every claim is replayable | Persist model/provider versions, prompt/policy version, input hashes, trace IDs, and gold-pack evaluation results |

## 2. Recommended production stack

### 2.1 Application framework and frontend

Use **Next.js App Router with TypeScript** for the web application, route handlers, server actions, layouts, and streaming UI. The App Router is the current Next.js architecture for React Server Components, layouts, and modern server/client boundaries [1]. Use React for the child reading canvas and the teacher/SET dashboard, Tailwind CSS plus shadcn/ui for accessible primitives, Zod for runtime validation, and TanStack Query only where client-side cache and optimistic mutation behaviour justify it.

Deploy the web surface to **Vercel** or an equivalent Next.js-compatible serverless platform. The architecture must not depend on long-lived Node processes. Browser requests should be short: authenticate, create a session, obtain a signed upload URL, complete a session, fetch a running record, or subscribe to record updates. Audio analysis is never performed inside a request handler.

### 2.2 Identity, tenancy, and database

Use **Supabase Auth** for email magic links initially, with OIDC/SAML enterprise federation added for larger school groups. Supabase supplies a full PostgreSQL database, Auth, Storage, Realtime, and serverless Edge Functions around the same project; its documentation recommends Row Level Security before exposing tables directly to a client [2]. Use PostgreSQL as the system of record, not a document store, because Reader Leader has relational tenancy, role, consent, content approval, audit, evaluation, and event-history requirements.

Use **Row Level Security** on every user-facing table. The browser may read only rows belonging to the authenticated user’s school or explicitly shared organisation. Service-role access is permitted only from trusted server-side functions and Trigger.dev tasks. Use Supabase Storage private buckets for audio and source texts; store object keys, not public URLs, in Postgres. Generate short-lived signed URLs only after the requesting user passes an RLS-backed authorisation check.

Supabase is selected for speed and coherence, not because it removes governance work. Production must verify the chosen region, data-processing agreement, subprocessors, backup policy, point-in-time recovery, deletion semantics, and whether audio objects are included in backups. Supabase documentation states that database backups do not automatically include Storage objects, so audio retention and backup deletion need a separate tested procedure [2].

### 2.3 Durable workflows and agent runtime

Use **Trigger.dev Cloud** for asynchronous analysis, retries, queues, schedules, long-running tasks, and durable workflow state. Supabase Edge Functions are appropriate for short-lived authenticated endpoints and webhooks, but their own guidance says heavy long-running jobs should move to background workers [3]. Trigger.dev is designed for long-running asynchronous tasks with retries, queues, observability, and checkpoint/resume behaviour [4].

Use **OpenAI Agents SDK for TypeScript** for the judgement agent, with structured outputs and explicit tools. OpenAI distinguishes the Responses API, where the application owns the loop, from the Agents SDK, where the SDK manages agent runs, tools, handoffs, guardrails, tracing, and resumable approvals [5]. Reader Leader should use the SDK for the bounded evidence-to-action run but retain a deterministic policy engine outside the model. The model may classify and explain evidence; it may not bypass policy gates or invent an action outside the enum.

### 2.4 Speech and alignment layer

Use **Speechace** as the initial production provider through a `SpeechProvider` adapter because it offers a reading-fluency surface and reference-text assessment [6]. Put the provider behind an internal interface so the production system can benchmark Speechmatics, Azure Pronunciation Assessment, and an open CTC model without changing the product workflow. Speechmatics is worth evaluating for accent handling and custom regional pronunciations; an open wav2vec2/XLS-R or WavLM path remains useful for local benchmarking and cost control.

The platform should not claim that a provider’s score is ground truth. The child-speech benchmark literature shows that model choice and fine-tuning materially affect results, while alignment research shows that onset and offset errors can materially affect phoneme-level pronunciation scores [7] [8]. Persist provider response payloads in a versioned, privacy-controlled evaluation store, not in the child-facing UI by default.

### 2.5 AI, content, observability, and operations

Use OpenAI structured outputs for metadata extraction, content screening assistance, and agent traces. Use embeddings only for library discovery and similarity, not for deciding correctness or safeguarding approval. Use `pgvector` in Postgres if semantic search is needed; keep the canonical content facets relational and inspectable.

Use **Sentry** for frontend and server errors, OpenTelemetry-compatible tracing for request and task correlation, OpenAI Agents traces for agent runs, and an immutable application audit table for high-value decisions. Use Resend or an equivalent transactional email service only for guardian consent and operational notifications; never put child voice content into email.

| Concern | Choice | Boundary |
|---|---|---|
| Web and API | Next.js App Router, TypeScript, Vercel | No long-running work in request handlers |
| UI | React, Tailwind, shadcn/ui, accessible audio player | Child view and adult evidence view are separate surfaces |
| Auth | Supabase Auth, magic link first, OIDC/SAML later | Session claims carry organisation and role context |
| Database | Supabase PostgreSQL, RLS, migrations | Service role never shipped to browser |
| Files | Supabase Storage private buckets, signed URLs | Audio is private, retention-limited, and separately deleted |
| Background work | Trigger.dev Cloud | Idempotent tasks, retries, dead-letter state, task handles |
| Agent | OpenAI Agents SDK TypeScript | Finite tools, structured output, guardrails, traces |
| Speech | Speechace adapter; Speechmatics/open CTC benchmark adapters | Provider scores are evidence, not truth |
| Validation | Zod schemas, Vitest, Playwright, golden replay tests | Every policy state has deterministic fixtures |
| Monitoring | Sentry, OpenTelemetry, agent traces, audit log | Alerts on false corrections, queue failures, PII leaks |
| Infrastructure as code | Terraform or Pulumi, plus Supabase migrations | Separate dev, staging, production projects |

## 3. System architecture

The browser is deliberately thin. It captures audio and renders status; it does not hold privileged credentials, decide policy, or call the LLM directly. The trusted application layer authorises actions and creates signed URLs. The durable task layer performs speech processing and orchestration. The agent uses bounded tools, and the deterministic policy engine remains the final authority on allowed actions.

![Reader Leader production architecture](/home/ubuntu/development_plan_pdf/reader-leader-architecture.png)

### Network and trust zones

| Zone | Components | Trust level | Controls |
|---|---|---|---|
| Public edge | Browser, CDN, WAF, Vercel edge | Untrusted client | CSP, CSRF protection, rate limits, bot protection, no secrets |
| Application | Next.js route handlers and server actions | Trusted application | Auth validation, Zod input validation, tenancy checks, signed URLs |
| Data | Supabase Auth, Postgres, Storage, Realtime | Restricted data plane | RLS, private buckets, encryption, retention jobs, audit records |
| Worker | Trigger.dev task workers | Privileged execution | Secret scopes, idempotency, retries, no direct browser exposure |
| AI provider | OpenAI, speech provider | External processor | DPA, region/subprocessor review, minimum payload, no training opt-in by default |
| Operations | Sentry, OpenTelemetry, audit log | Restricted telemetry | Redaction, role-based access, retention and access review |

### Request and network rules

1. The browser calls only the Next.js application and Supabase’s client-safe APIs.
2. Audio goes directly from the browser to a private Storage bucket using a short-lived signed upload URL. The browser never receives a service-role key.
3. Session completion creates an idempotent Trigger.dev task. The HTTP response returns a task handle rather than waiting for analysis.
4. Trigger.dev workers retrieve the private object, call the configured speech provider, run alignment and policy evaluation, write results to Postgres, and emit a Realtime update.
5. The agent receives only the minimum necessary context: passage ID, token sequence, learner phonics stage, pronunciation-set metadata, speech evidence, and policy version. It does not receive unrelated child profile data.
6. All model and provider calls include a correlation ID. Raw provider payloads are retained only when required for evaluation and are deleted on the same retention schedule as the source audio.

## 4. Domain model

The model should be event-oriented around a `reading_session`. A session is immutable in its raw inputs; derived analysis can be versioned and re-run. Human overrides never overwrite the original agent decision. They append a correction event linked to the original trace.

| Entity | Core fields | Key constraints |
|---|---|---|
| Organisation | `id`, `name`, `region`, `data_policy` | Tenant root; all school data belongs to one organisation |
| Membership | `user_id`, `organisation_id`, `role` | Roles: `school_admin`, `literacy_lead`, `teacher_set`, `content_steward`, `guardian`, `learner` |
| Learner | `id`, `organisation_id`, `display_name`, `year_group`, `phonics_stage`, `pronunciation_set_id` | Pseudonymous ID in analytics; guardian consent required before voice capture |
| Consent | `learner_id`, `guardian_id`, `purpose`, `training_opt_in`, `retention_until`, `withdrawn_at` | No session can start without valid purpose-specific consent |
| Passage | `id`, `title`, `body`, `language`, `region_tags`, `reading_level`, `phonics_profile` | Immutable version; child-visible only after approval |
| ContentReview | `passage_id`, `rights_status`, `safety_status`, `approval_status`, `reviewer_id` | Publication gate requires all statuses resolved and approved |
| ReadingSession | `id`, `learner_id`, `passage_version_id`, `status`, `started_at`, `completed_at` | Idempotency key prevents duplicate analysis |
| AudioAsset | `id`, `session_id`, `storage_key`, `sha256`, `duration_ms`, `retention_until` | Private object; deletion job must be verifiable |
| WordEvent | `id`, `session_id`, `token_index`, `reference_word`, `observed_form`, `event_type` | Event types include substitution, omission, insertion, repetition, self-correction, hesitation |
| EvidenceBundle | `word_event_id`, `audio_confidence`, `alignment_confidence`, `lexical_confidence`, `pronunciation_confidence`, `features_json` | Model/provider versions and input hash required |
| AgentDecision | `word_event_id`, `action`, `reason_code`, `policy_version`, `trace_id`, `confidence` | Action enum: `PROMPT`, `MODEL`, `STAY_SILENT`, `ESCALATE` |
| HumanReview | `agent_decision_id`, `reviewer_id`, `override_action`, `reason`, `created_at` | Append-only; never destroys original decision |
| EvaluationCase | `gold_pack_id`, `session_id`, `gold_label`, `agent_label`, `speaker_group` | Used to compute false correction and missed error separately |
| AuditEvent | `actor_type`, `actor_id`, `action`, `resource`, `before`, `after`, `trace_id` | Append-only, redacted, access-controlled |

## 5. Core user flows

### Flow A — Organisation onboarding and consent

A school administrator creates an organisation, invites a literacy lead, and assigns role-based access. The literacy lead creates a learner using a pseudonymous display name, links a guardian, and starts the consent flow. The guardian sees a plain-language explanation of recording, analysis, retention, withdrawal, and the separate training opt-in. Training opt-in is off by default. The session start endpoint checks consent, learner status, organisation membership, and passage approval before issuing an upload URL.

### Flow B — Content upload and approval

A teacher or content steward uploads a passage. The platform extracts provisional metadata, calculates a decodability profile, identifies likely reading-level and phonics facets, and requests confirmation of region, rights, and audience. The content pipeline places the passage in `DRAFT`, `WAITING_APPROVAL`, or `APPROVED`; only `APPROVED` passages are queryable by learner sessions. Unresolved rights or incomplete safety screening block publication. A parent upload defaults to the narrowest audience and cannot publish directly to a school group.

### Flow C — Learner reading session

The learner opens an approved passage and sees a supportive reading canvas, not a performance dashboard. The browser requests a session token, captures 16 kHz audio with MediaRecorder, performs local voice-activity detection and patience timing, and lets the learner self-flag uncertainty. After the read, the client uploads audio directly to private Storage, completes the session, and immediately shows “Your reading is being reviewed” rather than waiting for cloud analysis.

### Flow D — Agentic analysis and feedback

The completion endpoint creates a Trigger.dev task with a deterministic idempotency key derived from session ID and analysis version. The task retrieves the audio, calls the speech adapter, aligns the output to the known passage, builds word-level evidence, and invokes the Judgement Agent. The agent may use only registered tools: `get_reference_token`, `get_pronunciation_set`, `get_evidence_bundle`, `get_policy`, `propose_decision`, and `create_escalation`. The policy engine validates the proposal; an invalid or low-confidence proposal becomes `ESCALATE` or `STAY_SILENT` according to the configured safety policy.

The agent emits a structured trace for each event. The child-facing surface receives only safe feedback instructions. It never sees a diagnostic label, a raw confidence score, or a teacher-only interpretation. The adult dashboard receives the richer trace.

### Flow E — Teacher/SET review and override

The teacher opens the running record and sees accuracy, WCPM, prosody, self-correction ratio, event types, and audio links. Selecting an event plays only the relevant clip through a signed URL. The teacher can accept the decision or override it in two clicks with a reason such as “valid regional pronunciation,” “self-correction,” “background noise,” or “needs human listening.” The override creates a new `HumanReview` row and feeds the evaluation set; it never silently mutates the original agent output.

### Flow F — Evaluation and monitoring

A content steward or research lead uploads a gold-pack annotation file with speaker group, passage version, event label, and adjudication notes. The replay harness runs the same audio through candidate providers and policy versions, then computes false-correction rate, missed-error rate, abstention rate, self-correction capture, intervention latency, and override rate. The dashboard shows confidence intervals or at least numerator/denominator and sample size; no “fairness” badge appears without evidence.

![Reader Leader core user-flow sequence](/home/ubuntu/development_plan_pdf/reader-leader-sequence.png)

## 6. Agentic design

### 6.1 Agents and responsibilities

The production system should use one primary Judgement Agent with specialist tools, not a theatrical swarm of loosely defined agents. The content workflow can have a separate Content Screening Agent, but it must never approve publication by itself. A later production phase may split the Judgement Agent into `Evidence Analyst`, `Pedagogy Policy Agent`, and `Teacher Briefing Agent` only when traces show a real need for separation.

| Component | Type | Responsibility | Must not do |
|---|---|---|---|
| Evidence builder | Deterministic worker | Align audio, compute timings and confidence features | Decide pedagogy |
| Judgement Agent | OpenAI Agents SDK run | Interpret evidence, classify event, propose one bounded action, explain reason | Invent actions, diagnose, change learner level |
| Policy engine | Deterministic TypeScript module | Enforce confidence floors, accent rules, patience windows, action enum, escalation | Use hidden model intuition |
| Content Screening Agent | Structured LLM task | Extract facets, identify possible safety/rights concerns, draft review notes | Publish content or grant rights |
| Human reviewer | Teacher/SET/content steward | Override, interpret, approve, or reject | Be replaced by an autonomous decision |
| Evaluation runner | Deterministic task | Replay gold pack and report metrics | Improve results by changing labels after the fact |

### 6.2 Policy contract

The Judgement Agent returns a strict object:

```json
{
  "action": "PROMPT | MODEL | STAY_SILENT | ESCALATE",
  "event_type": "CORRECT | SUBSTITUTION | OMISSION | INSERTION | REPETITION | SELF_CORRECTION | HESITATION | UNKNOWN",
  "reason_code": "GENUINE_ERROR | SELF_CORRECTION_WINDOW | VALID_REGIONAL_VARIANT | LOW_ALIGNMENT_CONFIDENCE | LOW_AUDIO_QUALITY | PATIENCE_EXCEEDED",
  "confidence": 0.0,
  "evidence_refs": ["word-event-123", "pronunciation-set-irish-west-01"],
  "teacher_note": "string"
}
```

The deterministic policy engine rejects any output with an unknown enum, missing evidence reference, confidence below the action threshold, or a conflict with a valid regional pronunciation rule. It also applies the safety asymmetry: when evidence is ambiguous, it prefers silence or escalation over correction. The child receives no direct LLM prose; all child-facing prompts come from approved templates.

### 6.3 Guardrails and approvals

The input guardrail rejects missing consent, unapproved passage versions, audio outside the expected session, and requests to diagnose or alter reading level. The tool guardrail prevents the agent from calling storage, deleting records, changing permissions, or publishing content. The output guardrail validates the JSON schema, evidence references, confidence, and allowed action. Human approval is mandatory for content publication, learner-level changes, intervention status, and any case marked `ESCALATE`.

## 7. Security, privacy, and safeguarding

Use a threat model that treats a child’s voice as sensitive personal data and a school as a multi-tenant environment. The primary threats are cross-school data leakage, unauthorised audio access, excessive retention, model-provider reuse, prompt injection through uploaded text, fabricated agent decisions, and an adult seeing more child data than their role requires.

| Threat | Mitigation | Verification test |
|---|---|---|
| Cross-tenant read | RLS policies on every tenant table; organisation claims in session | Automated negative authorisation tests for every role |
| Audio URL leakage | Private buckets and short-lived signed URLs | Expired URL and wrong-role access tests |
| Over-retention | `retention_until`, scheduled deletion, deletion receipts | Test guardian withdrawal deletes audio and derived copies |
| Provider reuse | DPA review; no-training default; minimum payload | Contract checklist and payload snapshot review |
| Prompt injection in passages | Treat content as data; escape instructions; schema-only outputs | Malicious passage fixtures in screening and analysis tests |
| Agent hallucination | Evidence refs, strict schema, deterministic policy, replay | Golden cases with deliberately contradictory evidence |
| Unsafe content publication | Rights, safety, moderation, and approval gate | State-machine tests proving `WAITING_APPROVAL` is invisible |
| Child-facing harm | No diagnosis, no metrics, approved templates, adult escalation | UX review with literacy and safeguarding experts |

The Irish Data Protection Commission’s child-oriented Fundamentals are relevant because they introduce child-specific interpretive principles and recommended measures for organisations processing children’s data [9]. Production launch should complete a DPIA, data-flow map, processor review, retention schedule, guardian withdrawal procedure, incident response plan, and school data-processing agreement before live child voice collection.

## 8. API and event contracts

The API should be small, versioned, and task-oriented. Example endpoints include `POST /api/v1/sessions`, `POST /api/v1/sessions/:id/upload-url`, `POST /api/v1/sessions/:id/complete`, `GET /api/v1/sessions/:id/record`, `POST /api/v1/decisions/:id/override`, `POST /api/v1/passages`, `POST /api/v1/passages/:id/submit-review`, and `POST /api/v1/evaluations/replay`. Every mutation includes an idempotency key and writes an audit event.

The internal event vocabulary should include `session.created`, `audio.uploaded`, `analysis.requested`, `analysis.completed`, `decision.created`, `human.override_created`, `passage.submitted`, `passage.approved`, `consent.withdrawn`, and `retention.deleted`. Trigger.dev tasks subscribe to explicit application events rather than polling the database.

## 9. Delivery plan

### Phase 0 — Foundation and risk closure

Create separate Supabase dev, staging, and production projects; configure Auth, private buckets, RLS, migrations, secrets, Sentry, and CI. Freeze the policy contract, gold-pack schema, consent copy, and content approval state machine. Confirm the speech provider’s DPA and retention behaviour before any real child audio is uploaded.

### Phase 1 — Production-shaped vertical slice

Build organisation and role onboarding, approved passage selection, consent-gated session creation, direct audio upload, durable analysis task, provider adapter, known-text alignment, policy engine, teacher record, linked audio, and human override. Seed only synthetic or adult-performer data in development. Use a small consented evaluation set in staging.

### Phase 2 — Evaluation and trust

Implement deterministic replay, false-correction measurement, speaker-held-out splits, confidence calibration, action-latency metrics, audit export, retention deletion, and red-team fixtures. Add the regional pronunciation-set model and publish internal fairness dashboards. Make every model/provider/policy change produce a comparable evaluation report.

### Phase 3 — Pilot readiness

Add school-group tenancy, OIDC/SAML, guardian self-service withdrawal, content steward workflows, CSV/MIS import, support tooling, incident response, backup-restore testing, and procurement documentation. Run a supervised pilot with a small number of schools and measure record completion time, adult override rate, false correction, and teacher trust before increasing autonomy.

| Workstream | First production milestone | Definition of done |
|---|---|---|
| Frontend | Child session + adult evidence dashboard | Keyboard accessible, responsive, no child metrics, signed audio playback |
| Backend | Authenticated session and record APIs | RLS and negative authorisation tests pass |
| Speech | Provider adapter + known-text alignment | Held-out gold pack runs repeatably; uncertainty persisted |
| Agent | Judgement Agent + policy engine | Finite action contract, traces, guardrails, escalation |
| Content | Upload → metadata → moderation → approval | Unresolved rights and waiting approval are child-invisible |
| Data protection | Consent, withdrawal, retention, deletion | Deletion is tested across DB, storage, queues, and derived data |
| Operations | CI/CD, observability, alerts, runbooks | Incident and replay procedures documented |

## 10. Testing strategy

Unit tests cover policy thresholds, action enums, patience windows, accent rules, state transitions, RLS helper functions, consent checks, and retention calculations. Contract tests cover speech-provider adapters and OpenAI structured outputs. Integration tests cover signed uploads, Trigger.dev task retries, Postgres writes, Realtime updates, and override append-only behaviour. Playwright tests cover the child journey, adult review, content approval, and withdrawal.

The most important test suite is the **gold-pack replay harness**. Each case has an immutable audio hash, passage version, speaker group, gold event label, expected safe action, and adjudication notes. A change may not ship if false-correction rate worsens beyond the agreed tolerance without an explicit review. The harness should also test “silence is intentional” cases and provider outages.

## 11. Cost and scaling assumptions

Serverless keeps fixed infrastructure low during the sprint and early pilot, but voice processing and LLM calls become the variable cost centre. The system should record cost metadata per session: audio duration, provider, tokens, task retries, storage bytes, and derived asset count. Use quotas per organisation, per-role rate limits, and asynchronous batching for non-urgent content metadata.

Do not promise a final unit cost before provider contracts and measured session duration are known. The production abstraction should support a premium provider for higher-confidence assessment, a lower-cost fallback for practice, and local/open evaluation. The commercial pilot should price the evidence workflow and support, not expose raw model economics to schools.

## 12. Decision log and open questions

The recommended choices are intentionally opinionated, but several items need explicit validation before production launch.

| Decision | Status | Validation required |
|---|---|---|
| Next.js App Router + TypeScript | Recommended | Confirm team skill and hosting security baseline |
| Supabase Auth/Postgres/Storage/Realtime | Recommended | Confirm EU region, DPA, backup and deletion semantics |
| Trigger.dev Cloud | Recommended | Confirm data processing, task-region controls, and cost at pilot volume |
| OpenAI Agents SDK TypeScript | Recommended | Confirm model availability, structured-output behaviour, and provider terms |
| Speechace primary adapter | Recommended initial provider | Procurement, endpoint/data residency, children’s speech performance, and SLA review |
| Speechmatics/open CTC benchmark | Required secondary evaluation | Build held-out benchmark and compare false correction, not only WER |
| Vercel deployment | Recommended web host | Confirm region controls, logs, support, and school procurement requirements |
| OIDC/SAML | Later pilot feature | Needed for school-group rollout, not Challenge vertical slice |
| Open uploads | Deferred | Must not ship until rights, safety, moderation, and narrow permissions are proven |

## References

[1]: https://nextjs.org/docs/app "Next.js App Router documentation"  
[2]: https://supabase.com/docs/guides/database/overview "Supabase Database overview"  
[3]: https://supabase.com/docs/guides/functions "Supabase Edge Functions documentation"  
[4]: https://trigger.dev/docs/how-it-works "Trigger.dev: How it works"  
[5]: https://developers.openai.com/api/docs/guides/agents "OpenAI Agents SDK documentation"  
[6]: https://www.speechace.com/using-the-speechace-api-as-voice-ai-for-kids/ "Speechace API as Voice AI for kids"  
[7]: https://arxiv.org/html/2406.10507v1 "Benchmarking Children’s ASR with Supervised and Self-supervised Speech Foundation Models"  
[8]: https://pmc.ncbi.nlm.nih.gov/articles/PMC11977302/ "How Does Alignment Error Affect Automated Pronunciation Scoring in Children’s Speech?"  
[9]: https://www.dataprotection.ie/en/news-media/consultations/children-front-and-centre-fundamentals-child-oriented-approach-data-processing "Children Front and Centre: Fundamentals for a Child-Oriented Approach to Data Processing"  
[10]: /home/ubuntu/reader_leader_work/Idea_Research.pdf "Reader Leader — Idea Research"  
[11]: /home/ubuntu/reader_leader_work/Methodology_and_Ranked_List.pdf "Methodology and Ranked List"  

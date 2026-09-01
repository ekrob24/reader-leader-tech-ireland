# Reader Leader Vertical Slice Build Guide

## What has been created

This package contains the first executable vertical slice for Reader Leader. `spec.md` is the BMAD-ready intent contract. `src/contracts/domain.ts` defines the versioned Zod boundary. `src/agents/judgement-agent.ts` is a provider-neutral Judgement Agent adapter with the intended OpenAI Agents SDK settings. `src/policy/policy-gate.ts` is the deterministic fail-closed safety boundary. `sql/001_vertical_slice.sql` creates the Supabase schema, indexes, helper functions, RLS policies, and audit table. `fixtures/gold-pack/cases.json` provides replayable cases. `tests/vertical-slice.test.ts` proves the core behaviour. `src/evaluation/metrics.ts` computes the first safety metrics.

## Products and frameworks used

| Product/framework | Purpose | Why it is used |
|---|---|---|
| Next.js App Router | Web application and short-lived route handlers | TypeScript-native serverless delivery and clear server/client boundaries |
| Supabase Auth | Authentication | Managed identity, magic links first, enterprise federation later |
| Supabase PostgreSQL | System of record | Relational tenancy, consent, passages, sessions, evidence, decisions, reviews, and audit |
| Supabase Storage | Private audio and source files | Signed URLs and bucket-level privacy controls |
| Trigger.dev Cloud | Durable orchestration | Long-running tasks, retries, queues, schedules, and resumability |
| OpenAI Agents SDK for TypeScript | Bounded model agent | Structured outputs, tools, handoffs, guardrails, and traces |
| Speechace adapter | Initial speech evidence provider | Reading assessment behind a replaceable provider contract |
| Zod | Runtime contracts | Rejects malformed handoffs at every boundary |
| Vitest | Unit and contract tests | Fast deterministic testing for policies and fixtures |
| Playwright | Later browser tests | End-to-end consent, reading, teacher review, and override validation |
| Sentry/OpenTelemetry | Observability | Error tracking, correlation IDs, workflow visibility, and redaction review |
| BMAD Method | Product-development operating system | Keeps intent, architecture, stories, build, review, and retrospectives explicit |

## Build order

### Step 1: establish the project

Create the Next.js application and install the packages from `package.json`. Create separate Supabase projects for development, staging, and production. Store credentials in environment variables. Configure the OpenAI, Speechace, Trigger.dev, and Sentry secrets only on trusted server-side paths.

### Step 2: run BMAD planning

Use `bmad-spec` with `spec.md`, then use `bmad-architecture` to capture the production architecture and the agent contracts. Ask for story breakdown and implement one story per build session. The ordered stories are S1 through S8 in `spec.md`; do not reorder them until the contract and policy boundaries are stable.

### Step 3: migrate the data plane

Run `sql/001_vertical_slice.sql` in the Supabase SQL editor or through the Supabase CLI migration flow. Add storage buckets named `reading-audio-private` and `passages-private`. Keep both private. Add storage policies that permit only authorised server-side signed URL creation. Verify RLS with two test organisations and multiple roles before uploading real audio.

### Step 4: prove the fixture path

Load the gold-pack JSON in a local test runner. Parse each object with `EvidenceBundle`. Run the Pronunciation Context Agent against the supplied lexicon context, call the Judgement Agent adapter with a fake model runner, and send the result through `validateDecision`. Do not call a live model until the fake runner and policy tests pass.

### Step 5: connect the OpenAI Agents SDK

Wrap the Judgement Agent system prompt and `AgentDecision` schema in the OpenAI Agents SDK. Expose read-only tools for evidence, pronunciation context, self-correction timing, and policy configuration. Do not expose SQL write tools, browser tools, email tools, or unrestricted web access. Persist the SDK trace ID with the decision. The model is `gpt-5-mini`, temperature `0.0`, medium reasoning effort, 700 maximum output tokens, and one tool loop. Every model output is parsed by Zod and then validated by the deterministic Policy Gate.

### Step 6: add the Trigger.dev workflow

Create one idempotent task called `analyseReadingSession`. Its task input is `{ sessionId, audioObjectKey, passageVersionId, policyVersion }`. Fetch the private audio, call the `SpeechProvider` interface, create the evidence bundle, run pronunciation context, run judgement, run policy, and persist the result. Configure retries with exponential backoff. A failed task must move the session to `FAILED` and create an audit event; it must never silently retry into a second decision.

### Step 7: add adult and child surfaces

The child surface receives only a validated action and approved template key. `STAY_SILENT` returns no speech or corrective text and records intentional silence. The teacher surface receives the running record, evidence references, confidence components, the trace ID, and a review/override action. Human overrides append to `human_reviews`; they do not mutate `agent_decisions`.

### Step 8: run the gold pack before every release

Replay the gold pack against each provider, model, and policy version. Record false-correction rate, missed-error rate, abstention rate, self-correction capture, intervention latency, and human override rate by speaker group. A release is blocked if false correction worsens beyond the agreed tolerance or if a regional-variant case is corrected.

## Operational rules

The first release has four action values only. No agent may invent a fifth action. The Judgement Agent may propose but the Policy Gate validates. The Policy Gate must be deterministic and versioned. The Evidence Analyst provides evidence but cannot select pedagogy. The Teacher Briefing Agent can summarise validated events but cannot diagnose. The Content Steward Agent can draft review findings but cannot publish a passage without human approval.

The system must log model name, model version, prompt version, provider version, policy version, input hash, trace ID, confidence vector, and human override state. Raw audio and provider payloads must have explicit retention dates and deletion verification. Analytics should use pseudonymous learner IDs and should never export child voice data.

## Definition of done for the demo

A judge can select a known passage, run one fixture-backed reading event, see the Judgement Agent propose an action, see the Policy Gate accept or override it, observe a deliberate `STAY_SILENT` result for a valid regional pronunciation, inspect the evidence and trace in the teacher view, and override the action. The evaluation panel then shows that the original model decision remains available and that false corrections are measured separately from missed errors.

## Next build checkpoint

The immediate checkpoint is S1–S3: contracts, schema/RLS, and fixture evidence. Once those pass, implement S4–S6: pronunciation context, Judgement Agent, and Policy Gate. Only then add live Speechace calls and the polished UI. This order creates an evaluable, safe agentic core before provider noise and interface polish are introduced.

## References

[1]: https://docs.bmad-method.org/reference/workflow-map/ "BMAD Workflow Map"
[2]: https://docs.bmad-method.org/reference/agents/ "BMAD Skills and Agents"
[3]: https://developers.openai.com/api/docs/guides/agents "OpenAI Agents SDK"
[4]: https://supabase.com/docs/guides/database/overview "Supabase Database"
[5]: https://trigger.dev/docs/how-it-works "Trigger.dev"
[6]: https://www.speechace.com/using-the-speechace-api-as-voice-ai-for-kids/ "Speechace reading API"

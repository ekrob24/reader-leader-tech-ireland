# Reader Leader First Vertical Slice Specification

**Status:** Ready for implementation

**Outcome:** Given a known, approved passage and a versioned reading evidence bundle, Reader Leader proposes exactly one bounded action—`PROMPT`, `MODEL`, `STAY_SILENT`, or `ESCALATE`—validates it with deterministic policy, renders safe child feedback when permitted, and produces an adult-facing record that a teacher can override without destroying the original trace.

## Product intent

Reader Leader is an accent-aware reading-record workflow. It is not an open chatbot, diagnostic system, or autonomous teacher. The system listens to a child reading a known text, preserves a self-correction window, considers approved regional pronunciation context, and assists an adult by making cautious, replayable decisions.

## In scope for this slice

The slice supports one organisation, one approved passage version, one learner, one reading event, one evidence bundle, one agent proposal, deterministic policy validation, child-safe template selection, teacher briefing, and append-only human override. The first implementation uses fixture evidence; the speech provider adapter is introduced behind an interface and connected in a later story.

## Out of scope

Live multi-school tenancy, automatic level changes, dyslexia or other diagnosis, free-form child conversation, autonomous content publication, direct model access from the browser, model training on child audio, and unsupervised intervention are excluded.

## Non-negotiable safety rules

The system must fail closed. `STAY_SILENT` is a valid persisted action. A valid regional pronunciation must never be labelled an error. A self-correction must not be interrupted during the configured patience window. Low audio, alignment, lexical, or pronunciation confidence must produce `STAY_SILENT` or `ESCALATE`. The LLM may propose but cannot bypass policy, mutate records, or address the child directly.

## Definition of done

A fixture-driven run is accepted only when it creates a traceable evidence bundle, returns a schema-valid proposal, validates it through the deterministic policy gate, renders either an approved child-safe template or deliberate silence, creates a teacher briefing, and records all versions and evidence references. Tests must prove tenant/role boundaries at the schema level, invalid proposals fail closed, and the gold pack reports false-correction and abstention metrics separately.

## Technical decisions

The runtime uses TypeScript, Zod, the OpenAI Agents SDK adapter pattern for the Judgement Agent, Trigger.dev for durable execution, Supabase PostgreSQL/Auth/Storage/RLS, and Vitest. Model defaults are `gpt-5-mini`, temperature `0.0`, medium reasoning effort, one tool loop, and structured output. A future stronger model may adjudicate only human-requested low-confidence cases through a versioned model registry.

## BMAD story order

| ID | Story | Acceptance summary |
|---|---|---|
| S1 | Typed contracts | Every inbound and outbound object validates with Zod; unknown actions are rejected. |
| S2 | Supabase foundation | Core tables, enums, indexes, RLS, and append-only audit are migrated and tested. |
| S3 | Fixture evidence | A gold-pack case can be loaded as an immutable evidence bundle with confidence components. |
| S4 | Pronunciation context | A regional variant, mismatch, or uncertainty is classified with lexicon evidence. |
| S5 | Judgement proposal | The bounded agent returns one structured action with reason and evidence references. |
| S6 | Policy gate | The deterministic gate enforces confidence, patience, accent, action, and escalation rules. |
| S7 | Surfaces and override | Child feedback, teacher briefing, and append-only human override complete the trace. |
| S8 | Evaluation | Gold-pack replay computes safety metrics by speaker group and fails regressions. |

## Release gates

No live child audio is used until consent, retention, signed URLs, and deletion tests pass. No model change is released until the gold pack is replayed. No child-facing wording is released unless it comes from an approved template. No decision is displayed as a fact when its evidence is uncertain.

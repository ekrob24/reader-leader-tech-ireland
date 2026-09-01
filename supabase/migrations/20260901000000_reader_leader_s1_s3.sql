-- Reader Leader S1–S3 foundation. Apply to a Supabase PostgreSQL project.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('school_admin','literacy_lead','teacher_set','content_steward','guardian','learner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.session_status as enum ('CREATED','UPLOADING','ANALYSING','READY','BLOCKED','FAILED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.action as enum ('PROMPT','MODEL','STAY_SILENT','ESCALATE');
exception when duplicate_object then null; end $$;

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  region text not null default 'IE' check (length(region) = 2),
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, organisation_id)
);

create table if not exists public.learners (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  pronunciation_set_id text not null check (length(trim(pronunciation_set_id)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete cascade,
  guardian_id uuid not null references auth.users(id),
  purpose text not null check (length(trim(purpose)) > 0),
  training_opt_in boolean not null default false,
  retention_until timestamptz not null,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.passages (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  body text not null check (length(trim(body)) > 0),
  version integer not null default 1 check (version > 0),
  region_tags text[] not null default '{}',
  phonics_profile jsonb not null default '{}'::jsonb,
  approval_status text not null default 'DRAFT' check (approval_status in ('DRAFT','APPROVED','RETIRED')),
  rights_status text not null default 'UNREVIEWED' check (rights_status in ('UNREVIEWED','CLEARED','BLOCKED')),
  safety_status text not null default 'UNREVIEWED' check (safety_status in ('UNREVIEWED','PASSED','BLOCKED')),
  created_at timestamptz not null default now(),
  unique (organisation_id, id, version)
);

create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  learner_id uuid not null references public.learners(id),
  passage_id uuid not null references public.passages(id),
  status public.session_status not null default 'CREATED',
  idempotency_key text not null unique check (length(trim(idempotency_key)) > 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.evidence_bundles (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reading_sessions(id) on delete cascade,
  word_event_id text not null check (length(trim(word_event_id)) > 0),
  token_index integer not null check (token_index >= 0),
  reference_word text not null check (length(trim(reference_word)) > 0),
  observed_form text,
  event_type text not null check (event_type in ('CORRECT','SUBSTITUTION','OMISSION','INSERTION','REPETITION','SELF_CORRECTION','HESITATION','UNCERTAIN')),
  audio_confidence numeric not null check (audio_confidence between 0 and 1),
  alignment_confidence numeric not null check (alignment_confidence between 0 and 1),
  lexical_confidence numeric not null check (lexical_confidence between 0 and 1),
  pronunciation_confidence numeric not null check (pronunciation_confidence between 0 and 1),
  pronunciation_context text not null check (pronunciation_context in ('VALID_REGIONAL_VARIANT','NOT_MATCHED','UNCERTAIN')),
  self_correction_detected boolean not null default false,
  pause_before_intervention_ms integer not null default 0 check (pause_before_intervention_ms >= 0),
  evidence_refs text[] not null check (cardinality(evidence_refs) > 0),
  provider text not null check (length(trim(provider)) > 0),
  provider_version text not null check (length(trim(provider_version)) > 0),
  policy_version text not null check (length(trim(policy_version)) > 0),
  created_at timestamptz not null default now(),
  unique (session_id, word_event_id)
);

create table if not exists public.agent_decisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reading_sessions(id) on delete cascade,
  word_event_id text not null check (length(trim(word_event_id)) > 0),
  action public.action not null,
  event_type text not null,
  reason_code text not null check (length(trim(reason_code)) > 0),
  confidence numeric not null check (confidence between 0 and 1),
  evidence_refs text[] not null check (cardinality(evidence_refs) > 0),
  teacher_note text not null check (length(trim(teacher_note)) between 1 and 1000),
  policy_version text not null,
  trace_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.human_reviews (
  id uuid primary key default gen_random_uuid(),
  agent_decision_id uuid not null references public.agent_decisions(id),
  reviewer_id uuid not null references auth.users(id),
  override_action public.action not null,
  reason text not null check (length(trim(reason)) between 3 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null,
  actor_id uuid,
  action text not null,
  resource text not null,
  before_json jsonb,
  after_json jsonb,
  trace_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_memberships_org on public.memberships(organisation_id);
create index if not exists idx_learners_org on public.learners(organisation_id);
create index if not exists idx_sessions_learner on public.reading_sessions(learner_id, created_at desc);
create index if not exists idx_evidence_session on public.evidence_bundles(session_id);
create index if not exists idx_decisions_session on public.agent_decisions(session_id, created_at desc);

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.organisation_id = target_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_role(target_org uuid, allowed public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.organisation_id = target_org and m.user_id = auth.uid() and m.role = any(allowed)
  );
$$;

alter table public.organisations enable row level security;
alter table public.memberships enable row level security;
alter table public.learners enable row level security;
alter table public.consents enable row level security;
alter table public.passages enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.evidence_bundles enable row level security;
alter table public.agent_decisions enable row level security;
alter table public.human_reviews enable row level security;
alter table public.audit_events enable row level security;

create policy org_read on public.organisations for select using (public.is_org_member(id));
create policy membership_self_read on public.memberships for select using (user_id = auth.uid() or public.is_org_member(organisation_id));
create policy learner_org_read on public.learners for select using (public.is_org_member(organisation_id));
create policy consent_guardian_or_org_read on public.consents for select using (
  guardian_id = auth.uid() or exists (
    select 1 from public.learners l where l.id = learner_id and public.is_org_member(l.organisation_id)
  )
);
create policy passage_org_read on public.passages for select using (public.is_org_member(organisation_id));
create policy session_org_read on public.reading_sessions for select using (public.is_org_member(organisation_id));
create policy evidence_org_read on public.evidence_bundles for select using (
  exists (select 1 from public.reading_sessions s where s.id = session_id and public.is_org_member(s.organisation_id))
);
create policy decision_org_read on public.agent_decisions for select using (
  exists (select 1 from public.reading_sessions s where s.id = session_id and public.is_org_member(s.organisation_id))
);
create policy human_review_insert on public.human_reviews for insert with check (reviewer_id = auth.uid());
create policy audit_self_read on public.audit_events for select using (actor_id = auth.uid());

-- Client roles cannot mutate immutable evidence, decisions, or audit records.
revoke insert, update, delete on public.evidence_bundles from anon, authenticated;
revoke insert, update, delete on public.agent_decisions from anon, authenticated;
revoke update, delete on public.human_reviews from anon, authenticated;
revoke insert, update, delete on public.audit_events from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;

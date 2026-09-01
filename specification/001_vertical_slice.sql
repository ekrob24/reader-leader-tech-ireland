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
  id uuid primary key default gen_random_uuid(), name text not null, region text not null default 'IE', created_at timestamptz not null default now()
);
create table if not exists public.memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  role public.app_role not null,
  primary key(user_id, organisation_id)
);
create table if not exists public.learners (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id) on delete cascade,
  display_name text not null, pronunciation_set_id text not null, created_at timestamptz not null default now()
);
create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(), learner_id uuid not null references public.learners(id) on delete cascade,
  guardian_id uuid not null references auth.users(id), purpose text not null, training_opt_in boolean not null default false,
  retention_until timestamptz not null, withdrawn_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.passages (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id) on delete cascade,
  title text not null, body text not null, version integer not null default 1, region_tags text[] not null default '{}',
  phonics_profile jsonb not null default '{}'::jsonb, approval_status text not null default 'DRAFT', rights_status text not null default 'UNREVIEWED',
  safety_status text not null default 'UNREVIEWED', created_at timestamptz not null default now()
);
create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id) on delete cascade,
  learner_id uuid not null references public.learners(id), passage_id uuid not null references public.passages(id),
  status public.session_status not null default 'CREATED', idempotency_key text not null unique, started_at timestamptz, completed_at timestamptz
);
create table if not exists public.evidence_bundles (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.reading_sessions(id) on delete cascade,
  word_event_id text not null, token_index integer not null, reference_word text not null, observed_form text,
  event_type text not null, audio_confidence numeric not null check(audio_confidence between 0 and 1),
  alignment_confidence numeric not null check(alignment_confidence between 0 and 1), lexical_confidence numeric not null check(lexical_confidence between 0 and 1),
  pronunciation_confidence numeric not null check(pronunciation_confidence between 0 and 1), pronunciation_context text not null,
  self_correction_detected boolean not null default false, pause_before_intervention_ms integer not null default 0,
  evidence_refs text[] not null, provider text not null, provider_version text not null, policy_version text not null,
  created_at timestamptz not null default now(), unique(session_id, word_event_id)
);
create table if not exists public.agent_decisions (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.reading_sessions(id) on delete cascade,
  word_event_id text not null, action public.action not null, event_type text not null, reason_code text not null,
  confidence numeric not null check(confidence between 0 and 1), evidence_refs text[] not null, teacher_note text not null,
  policy_version text not null, trace_id text not null unique, created_at timestamptz not null default now()
);
create table if not exists public.human_reviews (
  id uuid primary key default gen_random_uuid(), agent_decision_id uuid not null references public.agent_decisions(id),
  reviewer_id uuid not null references auth.users(id), override_action public.action not null, reason text not null, created_at timestamptz not null default now()
);
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(), actor_type text not null, actor_id uuid, action text not null,
  resource text not null, before_json jsonb, after_json jsonb, trace_id text, created_at timestamptz not null default now()
);

create index if not exists idx_memberships_org on public.memberships(organisation_id);
create index if not exists idx_learners_org on public.learners(organisation_id);
create index if not exists idx_sessions_learner on public.reading_sessions(learner_id, created_at desc);
create index if not exists idx_evidence_session on public.evidence_bundles(session_id);
create index if not exists idx_decisions_session on public.agent_decisions(session_id, created_at desc);

create or replace function public.is_org_member(target_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.memberships m where m.organisation_id = target_org and m.user_id = auth.uid());
$$;
create or replace function public.has_role(target_org uuid, allowed public.app_role[]) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.memberships m where m.organisation_id = target_org and m.user_id = auth.uid() and m.role = any(allowed));
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
create policy passage_org_read on public.passages for select using (public.is_org_member(organisation_id));
create policy session_org_read on public.reading_sessions for select using (public.is_org_member(organisation_id));
create policy evidence_org_read on public.evidence_bundles for select using (exists(select 1 from public.reading_sessions s where s.id = session_id and public.is_org_member(s.organisation_id)));
create policy decision_org_read on public.agent_decisions for select using (exists(select 1 from public.reading_sessions s where s.id = session_id and public.is_org_member(s.organisation_id)));
create policy human_review_insert on public.human_reviews for insert with check (reviewer_id = auth.uid());
create policy audit_no_client_write on public.audit_events for select using (actor_id = auth.uid());

revoke all on public.audit_events from anon, authenticated;

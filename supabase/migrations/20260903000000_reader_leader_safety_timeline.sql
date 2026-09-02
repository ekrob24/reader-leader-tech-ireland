alter table public.learners add column if not exists safe_label text;
update public.learners set safe_label = display_name where safe_label is null;
alter table public.learners alter column safe_label set not null;
alter table public.learners add constraint learners_safe_label_length check (char_length(safe_label) between 1 and 120);

create table if not exists public.learner_safety_decisions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete restrict,
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  action text not null check (action in ('PROMPT', 'ENCOURAGE', 'STAY_SILENT')),
  status text not null default 'PROPOSED' check (status in ('PROPOSED', 'OVERRIDDEN', 'REVERSED')),
  summary text not null check (char_length(summary) between 1 and 240),
  override_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.learner_safety_events (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete restrict,
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  actor_id uuid not null,
  event_type text not null check (event_type in ('OVERRIDE_CREATED', 'OVERRIDE_REVERSED')),
  summary text not null check (char_length(summary) between 1 and 240),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (organisation_id, idempotency_key)
);

create index if not exists learners_organisation_idx on public.learners(organisation_id);
create index if not exists learner_safety_decisions_learner_created_idx on public.learner_safety_decisions(learner_id, created_at desc);
create index if not exists learner_safety_events_learner_created_idx on public.learner_safety_events(learner_id, created_at desc);

alter table public.learners enable row level security;
alter table public.learner_safety_decisions enable row level security;
alter table public.learner_safety_events enable row level security;

create policy learners_member_read on public.learners for select to authenticated using (
  exists (select 1 from public.memberships m where m.organisation_id = learners.organisation_id and m.user_id = auth.uid())
);
create policy learner_decisions_member_read on public.learner_safety_decisions for select to authenticated using (
  exists (select 1 from public.memberships m where m.organisation_id = learner_safety_decisions.organisation_id and m.user_id = auth.uid())
);
create policy learner_events_teacher_read on public.learner_safety_events for select to authenticated using (
  exists (select 1 from public.memberships m where m.organisation_id = learner_safety_events.organisation_id and m.user_id = auth.uid() and m.role in ('school_admin', 'literacy_lead', 'teacher_set'))
);
revoke insert, update, delete on public.learners from authenticated;
revoke insert, update, delete on public.learner_safety_decisions from authenticated;
revoke insert, update, delete on public.learner_safety_events from authenticated;

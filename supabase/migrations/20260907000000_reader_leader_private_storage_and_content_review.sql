-- Private object references are server-only. Logical deletion removes the key
-- from the application inventory and records a receipt; the platform storage
-- adapter does not provide an object-delete API.
alter table public.audio_assets add column if not exists storage_key text;
alter table public.derived_data_assets add column if not exists storage_key text;
alter table public.audio_assets add constraint audio_assets_storage_key_present_when_active check (deleted_at is not null or storage_key is not null);
alter table public.derived_data_assets add constraint derived_data_assets_storage_key_present_when_active check (deleted_at is not null or storage_key is not null);

do $$ begin
  create type public.content_review_action as enum ('DRAFT_CREATED', 'RIGHTS_CLEARED', 'RIGHTS_BLOCKED', 'SAFETY_PASSED', 'SAFETY_BLOCKED', 'APPROVED', 'RETIRED');
exception when duplicate_object then null; end $$;

alter table public.passages add column if not exists approved_at timestamptz;
alter table public.passages add column if not exists approved_by uuid references auth.users(id) on delete set null;
alter table public.passages add column if not exists creation_idempotency_key text;
update public.passages set creation_idempotency_key = coalesce(creation_idempotency_key, id::text) where creation_idempotency_key is null;
alter table public.passages alter column creation_idempotency_key set not null;
create unique index if not exists passages_org_creation_idempotency_idx on public.passages (organisation_id, creation_idempotency_key);

create table if not exists public.content_review_events (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid not null references public.passages(id) on delete restrict,
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  action public.content_review_action not null,
  idempotency_key text not null check (char_length(trim(idempotency_key)) between 8 and 120),
  created_at timestamptz not null default now()
);
create index if not exists content_review_events_passage_idx on public.content_review_events (passage_id, created_at desc);
create index if not exists content_review_events_organisation_idx on public.content_review_events (organisation_id, created_at desc);
create unique index if not exists content_review_events_reviewer_idempotency_idx on public.content_review_events (reviewer_id, idempotency_key);

-- Replace broad organisation passage reads with a safe selection boundary.
drop policy if exists passage_org_read on public.passages;
drop policy if exists passage_governance_read on public.passages;
drop policy if exists passage_approved_org_read on public.passages;
create policy passage_governance_read on public.passages for select to authenticated using (
  public.has_role(organisation_id, array['school_admin', 'literacy_lead', 'content_steward']::public.app_role[])
);
create policy passage_approved_org_read on public.passages for select to authenticated using (
  approval_status = 'APPROVED' and public.is_org_member(organisation_id)
);

alter table public.content_review_events enable row level security;
drop policy if exists content_review_events_reviewer_read on public.content_review_events;
create policy content_review_events_reviewer_read on public.content_review_events
for select to authenticated using (
  public.has_role(organisation_id, array['school_admin', 'literacy_lead', 'content_steward']::public.app_role[])
);
revoke all on public.content_review_events from anon, authenticated;
grant select on public.content_review_events to authenticated;

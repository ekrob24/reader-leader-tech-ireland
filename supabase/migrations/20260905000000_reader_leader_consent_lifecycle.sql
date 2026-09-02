-- Priority 1: consent, withdrawal, retention, and deletion verification.
-- This migration stores no audio bytes or raw provider payloads. It keeps only
-- deletion-verification inventory and append-only lifecycle evidence.

do $$ begin
  create type public.consent_status as enum ('ACTIVE', 'WITHDRAWN', 'EXPIRED', 'PENDING_DELETION', 'DELETED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.withdrawal_reason as enum ('WITHDRAWAL_OF_CONSENT', 'RETENTION_OBJECTION', 'ACCOUNT_CLOSURE', 'OTHER');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.deletion_scope as enum ('AUDIO_AND_DERIVED_DATA');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.deletion_request_status as enum ('REQUESTED', 'PROCESSING', 'COMPLETED', 'BLOCKED', 'FAILED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.deletion_target_kind as enum ('AUDIO_ASSET', 'DERIVED_DATA');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.deletion_receipt_outcome as enum ('DELETED', 'NOT_FOUND', 'BLOCKED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.lifecycle_audit_action as enum ('GUARDIAN_CONSENT_RECORDED', 'GUARDIAN_CONSENT_WITHDRAWN', 'DATA_DELETION_REQUESTED', 'AUDIO_DELETION_VERIFIED', 'DERIVED_DATA_DELETION_VERIFIED');
exception when duplicate_object then null; end $$;

create table if not exists public.guardian_learner_links (
  guardian_id uuid not null references auth.users(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  relationship_label text not null default 'guardian' check (char_length(trim(relationship_label)) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (guardian_id, learner_id)
);

alter table public.consents add column if not exists status public.consent_status;
alter table public.consents add column if not exists consent_text_version text;
alter table public.consents add column if not exists policy_version text;
alter table public.consents add column if not exists idempotency_key text;
update public.consents
set status = case when withdrawn_at is null then 'ACTIVE'::public.consent_status else 'WITHDRAWN'::public.consent_status end,
    consent_text_version = coalesce(consent_text_version, 'legacy-import'),
    policy_version = coalesce(policy_version, 'legacy-import'),
    idempotency_key = coalesce(idempotency_key, id::text)
where status is null or consent_text_version is null or policy_version is null or idempotency_key is null;
alter table public.consents alter column status set not null;
alter table public.consents alter column consent_text_version set not null;
alter table public.consents alter column policy_version set not null;
alter table public.consents alter column idempotency_key set not null;
alter table public.consents drop constraint if exists consents_training_opt_out;
alter table public.consents add constraint consents_training_opt_out check (training_opt_in = false);
create unique index if not exists consents_guardian_idempotency_key_idx on public.consents (guardian_id, idempotency_key);
create index if not exists consents_learner_status_idx on public.consents (learner_id, status, retention_until);

create table if not exists public.consent_withdrawals (
  id uuid primary key default gen_random_uuid(),
  consent_id uuid not null references public.consents(id) on delete restrict,
  learner_id uuid not null references public.learners(id) on delete restrict,
  guardian_id uuid not null references auth.users(id) on delete restrict,
  reason public.withdrawal_reason not null,
  idempotency_key text not null check (char_length(trim(idempotency_key)) between 8 and 120),
  requested_at timestamptz not null default now(),
  unique (consent_id),
  unique (guardian_id, idempotency_key)
);

create table if not exists public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete restrict,
  guardian_id uuid not null references auth.users(id) on delete restrict,
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  scope public.deletion_scope not null,
  status public.deletion_request_status not null default 'REQUESTED',
  idempotency_key text not null check (char_length(trim(idempotency_key)) between 8 and 120),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (guardian_id, idempotency_key)
);

create table if not exists public.audio_assets (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete restrict,
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  storage_object_hash char(64) not null check (storage_object_hash ~ '^[a-f0-9]{64}$'),
  sha256 char(64) not null check (sha256 ~ '^[a-f0-9]{64}$'),
  retention_until timestamptz not null,
  deleted_at timestamptz,
  deletion_request_id uuid references public.data_deletion_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organisation_id, storage_object_hash)
);

create table if not exists public.derived_data_assets (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete restrict,
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  source_audio_asset_id uuid references public.audio_assets(id) on delete restrict,
  asset_kind text not null check (asset_kind in ('SPEECH_ASSESSMENT', 'ALIGNMENT', 'DECISION_TRACE')),
  storage_object_hash char(64) check (storage_object_hash is null or storage_object_hash ~ '^[a-f0-9]{64}$'),
  retention_until timestamptz not null,
  deleted_at timestamptz,
  deletion_request_id uuid references public.data_deletion_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.data_deletion_receipts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.data_deletion_requests(id) on delete restrict,
  target_kind public.deletion_target_kind not null,
  target_reference_hash char(64) not null check (target_reference_hash ~ '^[a-f0-9]{64}$'),
  outcome public.deletion_receipt_outcome not null,
  verified_at timestamptz not null default now(),
  unique (request_id, target_kind, target_reference_hash)
);

create table if not exists public.data_lifecycle_audit_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  learner_id uuid not null references public.learners(id) on delete restrict,
  guardian_id uuid references auth.users(id) on delete set null,
  deletion_request_id uuid references public.data_deletion_requests(id) on delete set null,
  action public.lifecycle_audit_action not null,
  created_at timestamptz not null default now()
);

-- The append-only event is the source of truth. These triggers atomically block
-- new processing by updating the derived consent status in the same transaction.
create or replace function public.apply_consent_withdrawal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.consents
  set status = 'WITHDRAWN', withdrawn_at = coalesce(withdrawn_at, new.requested_at)
  where id = new.consent_id
    and learner_id = new.learner_id
    and guardian_id = new.guardian_id
    and status in ('ACTIVE', 'EXPIRED');
  if not found then raise exception 'guardian-owned active consent is required'; end if;
  return new;
end;
$$;
drop trigger if exists consent_withdrawal_blocks_processing on public.consent_withdrawals;
create trigger consent_withdrawal_blocks_processing
before insert on public.consent_withdrawals
for each row execute function public.apply_consent_withdrawal();

create or replace function public.prepare_data_deletion_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.consents
  set status = 'PENDING_DELETION'
  where learner_id = new.learner_id
    and guardian_id = new.guardian_id
    and purpose = 'READING_ASSESSMENT'
    and status in ('WITHDRAWN', 'PENDING_DELETION');
  if not found then raise exception 'withdrawn guardian consent is required before data deletion'; end if;
  return new;
end;
$$;
drop trigger if exists deletion_request_blocks_processing on public.data_deletion_requests;
create trigger deletion_request_blocks_processing
before insert on public.data_deletion_requests
for each row execute function public.prepare_data_deletion_request();

create index if not exists guardian_learner_links_learner_idx on public.guardian_learner_links (learner_id, guardian_id);
create index if not exists data_deletion_requests_learner_status_idx on public.data_deletion_requests (learner_id, status, requested_at desc);
create index if not exists audio_assets_deletion_inventory_idx on public.audio_assets (learner_id, deleted_at, retention_until);
create index if not exists derived_data_deletion_inventory_idx on public.derived_data_assets (learner_id, deleted_at, retention_until);
create index if not exists data_lifecycle_audit_events_learner_idx on public.data_lifecycle_audit_events (learner_id, created_at desc);

create or replace function public.is_guardian_for_learner(target_learner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.guardian_learner_links gl
    where gl.learner_id = target_learner and gl.guardian_id = auth.uid()
  );
$$;

alter table public.guardian_learner_links enable row level security;
alter table public.consents enable row level security;
alter table public.consent_withdrawals enable row level security;
alter table public.data_deletion_requests enable row level security;
alter table public.audio_assets enable row level security;
alter table public.derived_data_assets enable row level security;
alter table public.data_deletion_receipts enable row level security;
alter table public.data_lifecycle_audit_events enable row level security;

drop policy if exists guardian_link_self_read on public.guardian_learner_links;
create policy guardian_link_self_read on public.guardian_learner_links for select to authenticated using (guardian_id = auth.uid());
drop policy if exists consent_guardian_read on public.consents;
create policy consent_guardian_read on public.consents for select to authenticated using (guardian_id = auth.uid());
drop policy if exists withdrawal_guardian_read on public.consent_withdrawals;
create policy withdrawal_guardian_read on public.consent_withdrawals for select to authenticated using (guardian_id = auth.uid());
drop policy if exists deletion_request_guardian_read on public.data_deletion_requests;
create policy deletion_request_guardian_read on public.data_deletion_requests for select to authenticated using (guardian_id = auth.uid());
drop policy if exists deletion_receipt_guardian_read on public.data_deletion_receipts;
create policy deletion_receipt_guardian_read on public.data_deletion_receipts for select to authenticated using (
  exists (select 1 from public.data_deletion_requests request where request.id = request_id and request.guardian_id = auth.uid())
);
drop policy if exists lifecycle_audit_guardian_read on public.data_lifecycle_audit_events;
create policy lifecycle_audit_guardian_read on public.data_lifecycle_audit_events for select to authenticated using (guardian_id = auth.uid());

-- Private storage inventory and append-only audit evidence are server-only.
revoke all on public.guardian_learner_links from anon;
revoke all on public.consents, public.consent_withdrawals, public.data_deletion_requests, public.audio_assets, public.derived_data_assets, public.data_deletion_receipts, public.data_lifecycle_audit_events from anon, authenticated;
grant select on public.guardian_learner_links, public.consents, public.consent_withdrawals, public.data_deletion_requests, public.data_deletion_receipts, public.data_lifecycle_audit_events to authenticated;

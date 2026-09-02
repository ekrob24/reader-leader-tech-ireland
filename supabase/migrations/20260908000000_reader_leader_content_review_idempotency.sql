-- Follow-up for deployed databases: retry-safe passage creation and review events.
alter table public.passages add column if not exists creation_idempotency_key text;
update public.passages set creation_idempotency_key = coalesce(creation_idempotency_key, id::text) where creation_idempotency_key is null;
alter table public.passages alter column creation_idempotency_key set not null;
create unique index if not exists passages_org_creation_idempotency_idx on public.passages (organisation_id, creation_idempotency_key);

alter table public.content_review_events add column if not exists idempotency_key text;
update public.content_review_events set idempotency_key = coalesce(idempotency_key, id::text) where idempotency_key is null;
alter table public.content_review_events alter column idempotency_key set not null;
alter table public.content_review_events drop constraint if exists content_review_events_idempotency_key_check;
alter table public.content_review_events add constraint content_review_events_idempotency_key_check check (char_length(trim(idempotency_key)) between 8 and 120);
create unique index if not exists content_review_events_reviewer_idempotency_idx on public.content_review_events (reviewer_id, idempotency_key);

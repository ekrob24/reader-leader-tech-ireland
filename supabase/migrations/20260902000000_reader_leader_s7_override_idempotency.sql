-- Reader Leader S7: append-only override idempotency.

alter table public.human_reviews
  add column if not exists idempotency_key text;

update public.human_reviews
set idempotency_key = coalesce(idempotency_key, id::text)
where idempotency_key is null;

alter table public.human_reviews
  alter column idempotency_key set not null;

alter table public.human_reviews
  drop constraint if exists human_reviews_idempotency_key_check;

alter table public.human_reviews
  add constraint human_reviews_idempotency_key_check
  check (length(trim(idempotency_key)) between 1 and 120);

create unique index if not exists human_reviews_idempotency_key_idx
  on public.human_reviews (reviewer_id, idempotency_key);

revoke update, delete on public.human_reviews from anon, authenticated;

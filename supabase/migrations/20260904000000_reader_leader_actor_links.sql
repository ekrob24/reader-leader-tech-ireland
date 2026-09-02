create table if not exists public.reader_leader_actor_links (
  manus_open_id text primary key check (length(trim(manus_open_id)) > 0),
  supabase_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.reader_leader_actor_links enable row level security;
revoke all on public.reader_leader_actor_links from anon, authenticated;

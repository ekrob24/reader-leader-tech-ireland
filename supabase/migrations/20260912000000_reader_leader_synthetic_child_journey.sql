-- Synthetic-only child journey. Tokens are stored hashed; child clients receive
-- only approved passage text and fixed safe messages. No audio bytes are handled.
alter type public.session_status add value if not exists 'CHILD_READING';
alter type public.session_status add value if not exists 'COMPLETED';

create table if not exists public.child_session_tokens (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reading_sessions(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  help_requested_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists child_session_tokens_session_idx on public.child_session_tokens(session_id, created_at desc);

create table if not exists public.mock_word_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reading_sessions(id) on delete cascade,
  token_index integer not null check (token_index >= 0),
  reference_word text not null check (char_length(trim(reference_word)) between 1 and 80),
  event_type text not null check (event_type in ('SUBSTITUTION', 'SELF_CORRECTION', 'HESITATION')),
  suggested_action public.action not null,
  teacher_note text not null check (char_length(trim(teacher_note)) between 1 and 280),
  created_at timestamptz not null default now(),
  unique(session_id, token_index)
);
create index if not exists mock_word_events_session_idx on public.mock_word_events(session_id, token_index asc);

alter table public.child_session_tokens enable row level security;
alter table public.mock_word_events enable row level security;
revoke all on public.child_session_tokens, public.mock_word_events from anon, authenticated;

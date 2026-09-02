-- Hackathon demonstration records: metadata and safe summaries only. No audio
-- bytes, signed URL, speech output, transcript, or learner-facing metrics are stored.
do $$ begin
  create type public.mock_upload_status as enum ('NOT_STARTED', 'UPLOADED', 'BLOCKED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.mock_analysis_job_status as enum ('QUEUED', 'RUNNING', 'READY', 'FAILED', 'RETRYING', 'BLOCKED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.mock_trace_stage as enum ('SESSION_CONSENT_CHECKED', 'MOCK_UPLOAD_RECORDED', 'ANALYSIS_QUEUED', 'ANALYSIS_STARTED', 'EVIDENCE_COMPOSED', 'POLICY_GATE_PASSED', 'ANALYSIS_READY', 'ANALYSIS_RETRYING', 'ANALYSIS_BLOCKED');
exception when duplicate_object then null; end $$;

create table if not exists public.mock_session_uploads (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.reading_sessions(id) on delete cascade,
  upload_status public.mock_upload_status not null default 'NOT_STARTED',
  file_name text not null check (char_length(file_name) between 1 and 120),
  media_type text not null check (media_type in ('audio/webm', 'audio/wav')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 26214400),
  idempotency_key text not null unique check (char_length(trim(idempotency_key)) between 8 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.mock_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.reading_sessions(id) on delete cascade,
  status public.mock_analysis_job_status not null default 'QUEUED',
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 3),
  trace_id uuid not null unique default gen_random_uuid(),
  idempotency_key text not null unique check (char_length(trim(idempotency_key)) between 8 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mock_analysis_trace_events (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid not null references public.mock_analysis_jobs(trace_id) on delete cascade,
  session_id uuid not null references public.reading_sessions(id) on delete cascade,
  stage public.mock_trace_stage not null,
  safe_summary text not null check (char_length(safe_summary) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists mock_analysis_trace_session_idx on public.mock_analysis_trace_events (session_id, created_at asc);

alter table public.mock_session_uploads enable row level security;
alter table public.mock_analysis_jobs enable row level security;
alter table public.mock_analysis_trace_events enable row level security;
revoke all on public.mock_session_uploads, public.mock_analysis_jobs, public.mock_analysis_trace_events from anon, authenticated;

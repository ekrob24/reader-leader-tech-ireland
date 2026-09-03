-- Teacher-only acknowledgement state for completed synthetic sessions.
-- It is deliberately append-only: review history and completion evidence are never removed.
create table if not exists public.teacher_session_alert_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reading_sessions(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 120),
  acknowledged_at timestamptz not null default now(),
  unique (session_id, teacher_id)
);

alter table public.teacher_session_alert_acknowledgements enable row level security;

create policy "teacher can read own session acknowledgements"
  on public.teacher_session_alert_acknowledgements for select
  using (teacher_id = auth.uid());

create policy "teacher can append own session acknowledgements"
  on public.teacher_session_alert_acknowledgements for insert
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.reading_sessions rs
      where rs.id = session_id
        and public.has_role(rs.organisation_id, array['school_admin'::public.app_role, 'literacy_lead'::public.app_role, 'teacher_set'::public.app_role])
    )
  );

revoke update, delete on public.teacher_session_alert_acknowledgements from anon, authenticated;

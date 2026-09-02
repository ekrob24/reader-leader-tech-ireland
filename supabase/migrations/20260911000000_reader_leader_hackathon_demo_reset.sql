-- Tags records created by the hackathon mock workflow, allowing an authorised
-- adult to clear only synthetic session metadata and cascaded mock trace rows.
alter table public.reading_sessions add column if not exists demo_mode boolean not null default false;
create index if not exists reading_sessions_demo_mode_idx on public.reading_sessions (organisation_id, demo_mode, created_at desc);

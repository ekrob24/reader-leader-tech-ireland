-- Follow-up for deployed databases: establish atomic withdrawal/deletion state transitions.
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

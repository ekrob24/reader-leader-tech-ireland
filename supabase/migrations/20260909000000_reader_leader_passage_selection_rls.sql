-- Follow-up for deployed databases: teachers select only approved passages;
-- governance roles retain draft-review access.
drop policy if exists passage_org_read on public.passages;
drop policy if exists passage_governance_read on public.passages;
drop policy if exists passage_approved_org_read on public.passages;
create policy passage_governance_read on public.passages for select to authenticated using (
  public.has_role(organisation_id, array['school_admin', 'literacy_lead', 'content_steward']::public.app_role[])
);
create policy passage_approved_org_read on public.passages for select to authenticated using (
  approval_status = 'APPROVED' and public.is_org_member(organisation_id)
);

create or replace function public.current_app_can_read_lot(target_lot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_is_manager()
    or exists (
      select 1
      from public.lot_auditors la
      where la.lot_id = target_lot_id
        and la.auditor_id = public.current_app_user_id()
    );
$$;

drop policy if exists "auditors can read own lot assignments" on public.lot_auditors;
drop policy if exists "assigned lot team can read lot auditors" on public.lot_auditors;

create policy "assigned lot team can read lot auditors"
  on public.lot_auditors for select to authenticated
  using (public.current_app_can_read_lot(lot_id));

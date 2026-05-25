alter table public.controls
  add column if not exists tag text,
  add column if not exists linked_products text[] not null default '{}';

drop policy if exists "managers can insert notifications" on public.notifications;

create policy "authenticated app users can insert notifications"
  on public.notifications for insert to authenticated
  with check (public.current_app_user_id() is not null);

drop policy if exists "managers and assigned auditors can read answers" on public.answers;

create policy "managers and assigned lot auditors can read answers"
  on public.answers for select to authenticated
  using (
    public.current_app_is_manager()
    or exists (
      select 1
      from public.controls c
      join public.lot_verticals lv on lv.id = c.lot_vertical_id
      join public.lot_auditors la on la.lot_id = lv.lot_id
      where c.id = answers.control_id
        and la.auditor_id = public.current_app_user_id()
    )
  );

drop policy if exists "managers and assigned auditors can read answer evidences" on public.answer_evidences;

create policy "managers and assigned lot auditors can read answer evidences"
  on public.answer_evidences for select to authenticated
  using (
    public.current_app_is_manager()
    or exists (
      select 1
      from public.answers a
      join public.controls c on c.id = a.control_id
      join public.lot_verticals lv on lv.id = c.lot_vertical_id
      join public.lot_auditors la on la.lot_id = lv.lot_id
      where a.id = answer_evidences.answer_id
        and la.auditor_id = public.current_app_user_id()
    )
  );

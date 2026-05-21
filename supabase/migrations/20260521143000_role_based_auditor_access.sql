-- Role-based access for operational audit data.
-- Auditors only see their assigned lots and controls; supervisors/admins keep full operational access.

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.users where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_app_is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin', 'supervisor'), false);
$$;

drop policy if exists "anon can read lots" on public.lots;
drop policy if exists "authenticated can read lots" on public.lots;
drop policy if exists "authenticated can manage lots" on public.lots;

drop policy if exists "anon can read lot auditors" on public.lot_auditors;
drop policy if exists "authenticated can read lot auditors" on public.lot_auditors;
drop policy if exists "authenticated can manage lot auditors" on public.lot_auditors;

drop policy if exists "anon can read lot verticals" on public.lot_verticals;
drop policy if exists "authenticated can read lot verticals" on public.lot_verticals;
drop policy if exists "authenticated can manage lot verticals" on public.lot_verticals;

drop policy if exists "anon can read controls" on public.controls;
drop policy if exists "authenticated can read controls" on public.controls;
drop policy if exists "authenticated can manage controls" on public.controls;

drop policy if exists "anon can read audits" on public.audits;
drop policy if exists "authenticated can read audits" on public.audits;
drop policy if exists "authenticated can manage audits" on public.audits;

drop policy if exists "anon can read answers" on public.answers;
drop policy if exists "authenticated can manage answers" on public.answers;

drop policy if exists "anon can read answer evidences" on public.answer_evidences;
drop policy if exists "authenticated can manage answer evidences" on public.answer_evidences;

drop policy if exists "anon can read notifications" on public.notifications;
drop policy if exists "authenticated can read notifications" on public.notifications;
drop policy if exists "authenticated can manage notifications" on public.notifications;

create policy "managers can manage lots"
  on public.lots for all to authenticated
  using (public.current_app_is_manager())
  with check (public.current_app_is_manager());

create policy "auditors can read assigned lots"
  on public.lots for select to authenticated
  using (
    public.current_app_is_manager()
    or exists (
      select 1
      from public.lot_auditors la
      where la.lot_id = lots.id
        and la.auditor_id = public.current_app_user_id()
    )
  );

create policy "managers can manage lot auditors"
  on public.lot_auditors for all to authenticated
  using (public.current_app_is_manager())
  with check (public.current_app_is_manager());

create policy "auditors can read own lot assignments"
  on public.lot_auditors for select to authenticated
  using (public.current_app_is_manager() or auditor_id = public.current_app_user_id());

create policy "managers can manage lot verticals"
  on public.lot_verticals for all to authenticated
  using (public.current_app_is_manager())
  with check (public.current_app_is_manager());

create policy "auditors can read verticals for assigned lots"
  on public.lot_verticals for select to authenticated
  using (
    public.current_app_is_manager()
    or exists (
      select 1
      from public.lot_auditors la
      where la.lot_id = lot_verticals.lot_id
        and la.auditor_id = public.current_app_user_id()
    )
  );

create policy "managers and assigned lot auditors can insert controls"
  on public.controls for insert to authenticated
  with check (
    public.current_app_is_manager()
    or exists (
      select 1
      from public.lot_verticals lv
      join public.lot_auditors la on la.lot_id = lv.lot_id
      where lv.id = controls.lot_vertical_id
        and la.auditor_id = public.current_app_user_id()
    )
  );

create policy "managers can delete controls"
  on public.controls for delete to authenticated
  using (public.current_app_is_manager());

create policy "assigned auditors can read controls"
  on public.controls for select to authenticated
  using (
    public.current_app_is_manager()
    or exists (
      select 1
      from public.lot_verticals lv
      join public.lot_auditors la on la.lot_id = lv.lot_id
      where lv.id = controls.lot_vertical_id
        and la.auditor_id = public.current_app_user_id()
    )
  );

create policy "managers and assigned lot auditors can update controls"
  on public.controls for update to authenticated
  using (
    public.current_app_is_manager()
    or exists (
      select 1
      from public.lot_verticals lv
      join public.lot_auditors la on la.lot_id = lv.lot_id
      where lv.id = controls.lot_vertical_id
        and la.auditor_id = public.current_app_user_id()
    )
  )
  with check (
    public.current_app_is_manager()
    or exists (
      select 1
      from public.lot_verticals lv
      join public.lot_auditors la on la.lot_id = lv.lot_id
      where lv.id = controls.lot_vertical_id
        and la.auditor_id = public.current_app_user_id()
    )
  );

create policy "managers and assigned auditors can read audits"
  on public.audits for select to authenticated
  using (public.current_app_is_manager() or auditor_id = public.current_app_user_id());

create policy "assigned auditors can write own audits"
  on public.audits for insert to authenticated
  with check (
    public.current_app_is_manager()
    or (
      auditor_id = public.current_app_user_id()
      and exists (
        select 1
        from public.controls c
        where c.id = audits.control_id
          and c.auditor_id = public.current_app_user_id()
      )
    )
  );

create policy "assigned auditors can update own audits"
  on public.audits for update to authenticated
  using (public.current_app_is_manager() or auditor_id = public.current_app_user_id())
  with check (public.current_app_is_manager() or auditor_id = public.current_app_user_id());

create policy "managers and assigned auditors can read answers"
  on public.answers for select to authenticated
  using (
    public.current_app_is_manager()
    or (
      auditor_id = public.current_app_user_id()
      and exists (
        select 1
        from public.controls c
        where c.id = answers.control_id
          and c.auditor_id = public.current_app_user_id()
      )
    )
  );

create policy "assigned auditors can write own answers"
  on public.answers for insert to authenticated
  with check (
    public.current_app_is_manager()
    or (
      auditor_id = public.current_app_user_id()
      and exists (
        select 1
        from public.controls c
        where c.id = answers.control_id
          and c.auditor_id = public.current_app_user_id()
      )
    )
  );

create policy "assigned auditors can update own answers"
  on public.answers for update to authenticated
  using (public.current_app_is_manager() or auditor_id = public.current_app_user_id())
  with check (
    public.current_app_is_manager()
    or (
      auditor_id = public.current_app_user_id()
      and exists (
        select 1
        from public.controls c
        where c.id = answers.control_id
          and c.auditor_id = public.current_app_user_id()
      )
    )
  );

create policy "managers and assigned auditors can read answer evidences"
  on public.answer_evidences for select to authenticated
  using (
    public.current_app_is_manager()
    or exists (
      select 1
      from public.answers a
      join public.controls c on c.id = a.control_id
      where a.id = answer_evidences.answer_id
        and a.auditor_id = public.current_app_user_id()
        and c.auditor_id = public.current_app_user_id()
    )
  );

create policy "assigned auditors can write own answer evidences"
  on public.answer_evidences for insert to authenticated
  with check (
    public.current_app_is_manager()
    or exists (
      select 1
      from public.answers a
      join public.controls c on c.id = a.control_id
      where a.id = answer_evidences.answer_id
        and a.auditor_id = public.current_app_user_id()
        and c.auditor_id = public.current_app_user_id()
    )
  );

create policy "managers and owners can read notifications"
  on public.notifications for select to authenticated
  using (public.current_app_is_manager() or user_id = public.current_app_user_id());

create policy "managers and owners can update notifications"
  on public.notifications for update to authenticated
  using (public.current_app_is_manager() or user_id = public.current_app_user_id())
  with check (public.current_app_is_manager() or user_id = public.current_app_user_id());

create policy "managers can insert notifications"
  on public.notifications for insert to authenticated
  with check (public.current_app_is_manager());

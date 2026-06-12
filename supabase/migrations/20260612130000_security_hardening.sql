-- Security hardening: remove development-era open policies and tighten app access.

create or replace function public.current_app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

create or replace function public.current_app_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.status = 'activo'
  );
$$;

revoke all on table public.audited_response_notes from anon;
revoke all on function public.current_app_audited_user_matches(text[]) from anon;
revoke all on function public.current_app_can_read_replica_control(uuid) from anon;
revoke all on function public.current_app_can_read_replica_answer(uuid) from anon;
revoke all on function public.current_app_can_read_replica_lot_vertical(uuid) from anon;
revoke all on function public.current_app_can_read_replica_lot(uuid) from anon;

grant execute on function public.current_app_is_admin() to authenticated;
grant execute on function public.current_app_is_active() to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
    set
      auth_user_id = new.id,
      company = coalesce(nullif(new.raw_user_meta_data->>'company', ''), nullif(new.raw_user_meta_data->>'empresa', ''), company),
      cargo = coalesce(nullif(new.raw_user_meta_data->>'cargo', ''), cargo),
      area = coalesce(nullif(new.raw_user_meta_data->>'area', ''), area)
  where lower(email) = lower(new.email)
    and auth_user_id is null;

  return new;
end;
$$;

drop policy if exists "anon can read users" on public.users;
drop policy if exists "anon can read business units" on public.business_units;
drop policy if exists "anon can read cycles" on public.cycles;
drop policy if exists "anon can read thresholds" on public.thresholds;
drop policy if exists "anon can read control models" on public.control_models;
drop policy if exists "anon can read model business units" on public.model_business_units;
drop policy if exists "anon can read verticals" on public.verticals;
drop policy if exists "anon can read parameters" on public.parameters;
drop policy if exists "anon can read questions" on public.questions;
drop policy if exists "anon can read lots" on public.lots;
drop policy if exists "anon can read lot auditors" on public.lot_auditors;
drop policy if exists "anon can read lot verticals" on public.lot_verticals;
drop policy if exists "anon can read controls" on public.controls;
drop policy if exists "anon can read audits" on public.audits;
drop policy if exists "anon can read answers" on public.answers;
drop policy if exists "anon can read answer evidences" on public.answer_evidences;
drop policy if exists "anon can read notifications" on public.notifications;

drop policy if exists "authenticated can manage users" on public.users;
drop policy if exists "authenticated can manage business units" on public.business_units;
drop policy if exists "authenticated can manage cycles" on public.cycles;
drop policy if exists "authenticated can manage thresholds" on public.thresholds;
drop policy if exists "authenticated can manage models" on public.control_models;
drop policy if exists "authenticated can manage model units" on public.model_business_units;
drop policy if exists "authenticated can manage verticals" on public.verticals;
drop policy if exists "authenticated can manage parameters" on public.parameters;
drop policy if exists "authenticated can manage questions" on public.questions;
drop policy if exists "authenticated can manage lots" on public.lots;
drop policy if exists "authenticated can manage lot auditors" on public.lot_auditors;
drop policy if exists "authenticated can manage lot verticals" on public.lot_verticals;
drop policy if exists "authenticated can manage controls" on public.controls;
drop policy if exists "authenticated can manage audits" on public.audits;
drop policy if exists "authenticated can manage answers" on public.answers;
drop policy if exists "authenticated can manage answer evidences" on public.answer_evidences;
drop policy if exists "authenticated can manage notifications" on public.notifications;

drop policy if exists "authenticated can read users" on public.users;
drop policy if exists "active app users can read permitted users" on public.users;
create policy "active app users can read permitted users"
  on public.users for select to authenticated
  using (
    public.current_app_is_active()
    and (
      public.current_app_is_manager()
      or auth_user_id = auth.uid()
      or (
        public.current_app_role() = 'auditor'
        and role = 'auditado'
        and status = 'activo'
      )
    )
  );

drop policy if exists "authenticated can insert own profile" on public.users;

drop policy if exists "authenticated can update own profile" on public.users;
create policy "authenticated can update own profile"
  on public.users for update to authenticated
  using (auth_user_id = auth.uid() and public.current_app_is_active())
  with check (
    auth_user_id = auth.uid()
    and role::text = public.current_app_role()
    and status = 'activo'
  );

drop policy if exists "managers can manage users" on public.users;
create policy "admins can manage users"
  on public.users for all to authenticated
  using (public.current_app_is_admin())
  with check (public.current_app_is_admin());

drop policy if exists "authenticated can read configuration" on public.business_units;
drop policy if exists "authenticated can read cycles" on public.cycles;
drop policy if exists "authenticated can read thresholds" on public.thresholds;
drop policy if exists "authenticated can read models" on public.control_models;
drop policy if exists "authenticated can read model units" on public.model_business_units;
drop policy if exists "authenticated can read verticals" on public.verticals;
drop policy if exists "authenticated can read parameters" on public.parameters;

drop policy if exists "active app users can read business units" on public.business_units;
create policy "active app users can read business units"
  on public.business_units for select to authenticated
  using (public.current_app_is_active());

drop policy if exists "active app users can read cycles" on public.cycles;
create policy "active app users can read cycles"
  on public.cycles for select to authenticated
  using (public.current_app_is_active());

drop policy if exists "active app users can read thresholds" on public.thresholds;
create policy "active app users can read thresholds"
  on public.thresholds for select to authenticated
  using (public.current_app_is_active());

drop policy if exists "active app users can read models" on public.control_models;
create policy "active app users can read models"
  on public.control_models for select to authenticated
  using (public.current_app_is_active());

drop policy if exists "active app users can read model units" on public.model_business_units;
create policy "active app users can read model units"
  on public.model_business_units for select to authenticated
  using (public.current_app_is_active());

drop policy if exists "active app users can read verticals" on public.verticals;
create policy "active app users can read verticals"
  on public.verticals for select to authenticated
  using (public.current_app_is_active());

drop policy if exists "active app users can read parameters" on public.parameters;
create policy "active app users can read parameters"
  on public.parameters for select to authenticated
  using (public.current_app_is_active());

drop policy if exists "authenticated app users can insert notifications" on public.notifications;
drop policy if exists "active managers and auditors can insert notifications" on public.notifications;
create policy "active managers and auditors can insert notifications"
  on public.notifications for insert to authenticated
  with check (
    public.current_app_is_active()
    and public.current_app_role() in ('admin', 'supervisor', 'auditor')
  );

drop policy if exists "authenticated can read answer evidence files" on storage.objects;
drop policy if exists "authenticated can upload answer evidence files" on storage.objects;
drop policy if exists "authenticated can update answer evidence files" on storage.objects;
drop policy if exists "authenticated can delete answer evidence files" on storage.objects;

drop policy if exists "app users can read permitted answer evidence files" on storage.objects;
create policy "app users can read permitted answer evidence files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'answer-evidences'
    and (
      public.current_app_is_manager()
      or exists (
        select 1
        from public.answer_evidences ae
        join public.answers a on a.id = ae.answer_id
        join public.controls c on c.id = a.control_id
        where ae.file_url = storage.objects.name
          and (
            c.auditor_id = public.current_app_user_id()
            or public.current_app_can_read_replica_answer(a.id)
          )
      )
      or exists (
        select 1
        from public.audited_response_notes arn
        join public.answers a on a.id = arn.answer_id
        join public.controls c on c.id = a.control_id
        where arn.file_url = storage.objects.name
          and (
            arn.user_id = public.current_app_user_id()
            or c.auditor_id = public.current_app_user_id()
            or public.current_app_can_read_replica_answer(a.id)
          )
      )
    )
  );

drop policy if exists "auditors can upload answer evidence files" on storage.objects;
create policy "auditors can upload answer evidence files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'answer-evidences'
    and public.current_app_is_active()
    and (
      (
        (storage.foldername(name))[1] <> 'auditado'
        and exists (
          select 1
          from public.answers a
          join public.controls c on c.id = a.control_id
          where a.id::text = (storage.foldername(name))[2]
            and a.control_id::text = (storage.foldername(name))[1]
            and a.auditor_id = public.current_app_user_id()
            and c.auditor_id = public.current_app_user_id()
        )
      )
      or (
        (storage.foldername(name))[1] = 'auditado'
        and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        and (storage.foldername(name))[3] = public.current_app_user_id()::text
        and public.current_app_can_read_replica_answer(((storage.foldername(name))[2])::uuid)
      )
    )
  );

drop policy if exists "managers can delete answer evidence files" on storage.objects;
create policy "managers can delete answer evidence files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'answer-evidences' and public.current_app_is_manager());

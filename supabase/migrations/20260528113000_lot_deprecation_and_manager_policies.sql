alter type public.lote_status add value if not exists 'deprecado';

drop policy if exists "authenticated can manage business units" on public.business_units;
drop policy if exists "authenticated can manage cycles" on public.cycles;
drop policy if exists "authenticated can manage model units" on public.model_business_units;
drop policy if exists "authenticated can manage models" on public.control_models;
drop policy if exists "authenticated can manage parameters" on public.parameters;
drop policy if exists "authenticated can manage thresholds" on public.thresholds;
drop policy if exists "authenticated can manage users" on public.users;
drop policy if exists "authenticated can manage verticals" on public.verticals;

drop policy if exists "managers can manage business units" on public.business_units;
drop policy if exists "managers can manage cycles" on public.cycles;
drop policy if exists "managers can manage model units" on public.model_business_units;
drop policy if exists "managers can manage models" on public.control_models;
drop policy if exists "managers can manage parameters" on public.parameters;
drop policy if exists "managers can manage thresholds" on public.thresholds;
drop policy if exists "managers can manage users" on public.users;
drop policy if exists "managers can manage verticals" on public.verticals;

create policy "managers can manage business units"
  on public.business_units to authenticated
  using (public.current_app_is_manager())
  with check (public.current_app_is_manager());

create policy "managers can manage cycles"
  on public.cycles to authenticated
  using (public.current_app_is_manager())
  with check (public.current_app_is_manager());

create policy "managers can manage model units"
  on public.model_business_units to authenticated
  using (public.current_app_is_manager())
  with check (public.current_app_is_manager());

create policy "managers can manage models"
  on public.control_models to authenticated
  using (public.current_app_is_manager())
  with check (public.current_app_is_manager());

create policy "managers can manage parameters"
  on public.parameters to authenticated
  using (public.current_app_is_manager())
  with check (public.current_app_is_manager());

create policy "managers can manage thresholds"
  on public.thresholds to authenticated
  using (public.current_app_is_manager())
  with check (public.current_app_is_manager());

create policy "managers can manage users"
  on public.users to authenticated
  using (public.current_app_is_manager())
  with check (public.current_app_is_manager());

create policy "managers can manage verticals"
  on public.verticals to authenticated
  using (public.current_app_is_manager())
  with check (public.current_app_is_manager());

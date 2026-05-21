-- Development bootstrap for local testing.
-- Run this in Supabase SQL editor if the app loads empty tables or writes fail.

do $$
begin
  if to_regclass('public.users') is null
    or to_regclass('public.business_units') is null
    or to_regclass('public.cycles') is null
    or to_regclass('public.thresholds') is null
    or to_regclass('public.control_models') is null
  then
    raise exception 'Missing base audit tables. Run supabase/migrations/20260520120000_initial_audit_schema.sql first, then run this bootstrap file again.';
  end if;
end $$;

alter table public.users
  add column if not exists company text;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (auth_user_id, name, email, company, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Usuario'),
    new.email,
    coalesce(new.raw_user_meta_data->>'company', new.raw_user_meta_data->>'empresa'),
    'auditor',
    'activo'
  )
  on conflict (email) do update
    set auth_user_id = excluded.auth_user_id,
        name = coalesce(public.users.name, excluded.name),
        company = coalesce(public.users.company, excluded.company),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

do $$ begin
  create policy "authenticated can manage users" on public.users for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.users;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage business units" on public.business_units for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage cycles" on public.cycles for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage thresholds" on public.thresholds for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage models" on public.control_models for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage verticals" on public.verticals for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage parameters" on public.parameters for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage lots" on public.lots for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage lot auditors" on public.lot_auditors for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage lot verticals" on public.lot_verticals for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage controls" on public.controls for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage audits" on public.audits for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage answers" on public.answers for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage notifications" on public.notifications for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

insert into public.thresholds (name, min_value, max_value, color)
values
  ('Critico', 0, 70, 'rojo'),
  ('Aceptable', 71, 89, 'amarillo'),
  ('Optimo', 90, 100, 'verde')
on conflict do nothing;

insert into public.cycles (year, bimester, start_date, end_date)
values
  (2026, 1, '2026-01-01', '2026-02-28'),
  (2026, 2, '2026-03-01', '2026-04-30'),
  (2026, 3, '2026-05-01', '2026-06-30'),
  (2026, 4, '2026-07-01', '2026-08-31'),
  (2026, 5, '2026-09-01', '2026-10-31'),
  (2026, 6, '2026-11-01', '2026-12-31')
on conflict (year, bimester) do nothing;

notify pgrst, 'reload schema';

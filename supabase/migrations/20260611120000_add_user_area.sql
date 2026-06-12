alter table public.users
  add column if not exists area text;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (auth_user_id, name, email, company, cargo, area, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Usuario'),
    new.email,
    coalesce(new.raw_user_meta_data->>'company', new.raw_user_meta_data->>'empresa'),
    new.raw_user_meta_data->>'cargo',
    new.raw_user_meta_data->>'area',
    'auditor',
    'activo'
  )
  on conflict (email) do update
    set auth_user_id = coalesce(public.users.auth_user_id, excluded.auth_user_id),
        name = coalesce(public.users.name, excluded.name),
        company = coalesce(public.users.company, excluded.company),
        cargo = coalesce(public.users.cargo, excluded.cargo),
        area = coalesce(public.users.area, excluded.area);

  return new;
end;
$$;

-- Profile sync for Supabase Auth.
-- Creates/links public.users rows when a new auth user signs up.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (auth_user_id, name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Usuario'),
    new.email,
    'auditor',
    'activo'
  )
  on conflict (email) do update
    set auth_user_id = excluded.auth_user_id,
        name = coalesce(public.users.name, excluded.name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

do $$ begin
  create policy "authenticated can insert own profile"
    on public.users for insert to authenticated
    with check (auth_user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can update own profile"
    on public.users for update to authenticated
    using (auth_user_id = auth.uid())
    with check (auth_user_id = auth.uid());
exception when duplicate_object then null;
end $$;

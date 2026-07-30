begin;

select plan(6);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'active@test.local', ''),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'inactive@test.local', '');

insert into public.users (auth_user_id, name, email, role, status)
values
  ('10000000-0000-4000-8000-000000000001', 'Active Admin', 'active@test.local', 'admin', 'activo'),
  ('10000000-0000-4000-8000-000000000002', 'Inactive Admin', 'inactive@test.local', 'admin', 'inactivo');

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select ok(public.current_app_is_active(), 'active profile is active');
select is(public.current_app_role(), 'admin', 'active profile exposes its role');
select ok(public.current_app_is_admin(), 'active admin is recognized');

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
set local role authenticated;

select isnt(public.current_app_is_active(), true, 'inactive profile is rejected');
select is(public.current_app_role(), null, 'inactive profile has no effective role');
select isnt(public.current_app_is_admin(), true, 'inactive admin has no admin capability');

select * from finish();
rollback;

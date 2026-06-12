create table if not exists public.audited_response_notes (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.answers(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  comment text,
  file_url text,
  file_name text,
  file_type text,
  created_at timestamptz not null default now(),
  constraint audited_response_notes_has_content check (
    comment is not null or file_url is not null
  )
);

create index if not exists idx_audited_response_notes_answer_id on public.audited_response_notes(answer_id);
create index if not exists idx_audited_response_notes_user_id on public.audited_response_notes(user_id);

alter table public.audited_response_notes enable row level security;

grant all on table public.audited_response_notes to anon;
grant all on table public.audited_response_notes to authenticated;
grant all on table public.audited_response_notes to service_role;

create or replace function public.current_app_audited_user_matches(target_people text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join unnest(coalesce(target_people, '{}'::text[])) as audited_person(value) on true
    where u.id = public.current_app_user_id()
      and u.role = 'auditado'
      and (
        lower(trim(audited_person.value)) = lower(trim(u.name))
        or lower(trim(audited_person.value)) = lower(trim(u.email))
        or lower(trim(audited_person.value)) like '%' || lower(trim(u.name)) || '%'
        or lower(trim(audited_person.value)) like '%' || lower(trim(u.email)) || '%'
      )
  );
$$;

create or replace function public.current_app_can_read_replica_control(target_control_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.answers a
    join public.controls c on c.id = a.control_id
    where a.control_id = target_control_id
      and c.status in ('en_replica', 'terminado', 'terminada')
      and public.current_app_audited_user_matches(a.audited_people)
  );
$$;

create or replace function public.current_app_can_read_replica_answer(target_answer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.answers a
    join public.controls c on c.id = a.control_id
    where a.id = target_answer_id
      and c.status in ('en_replica', 'terminado', 'terminada')
      and public.current_app_audited_user_matches(a.audited_people)
  );
$$;

create or replace function public.current_app_can_read_replica_lot_vertical(target_lot_vertical_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.controls c
    where c.lot_vertical_id = target_lot_vertical_id
      and public.current_app_can_read_replica_control(c.id)
  );
$$;

create or replace function public.current_app_can_read_replica_lot(target_lot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lot_verticals lv
    where lv.lot_id = target_lot_id
      and public.current_app_can_read_replica_lot_vertical(lv.id)
  );
$$;

grant all on function public.current_app_audited_user_matches(text[]) to anon;
grant all on function public.current_app_audited_user_matches(text[]) to authenticated;
grant all on function public.current_app_audited_user_matches(text[]) to service_role;
grant all on function public.current_app_can_read_replica_control(uuid) to anon;
grant all on function public.current_app_can_read_replica_control(uuid) to authenticated;
grant all on function public.current_app_can_read_replica_control(uuid) to service_role;
grant all on function public.current_app_can_read_replica_answer(uuid) to anon;
grant all on function public.current_app_can_read_replica_answer(uuid) to authenticated;
grant all on function public.current_app_can_read_replica_answer(uuid) to service_role;
grant all on function public.current_app_can_read_replica_lot_vertical(uuid) to anon;
grant all on function public.current_app_can_read_replica_lot_vertical(uuid) to authenticated;
grant all on function public.current_app_can_read_replica_lot_vertical(uuid) to service_role;
grant all on function public.current_app_can_read_replica_lot(uuid) to anon;
grant all on function public.current_app_can_read_replica_lot(uuid) to authenticated;
grant all on function public.current_app_can_read_replica_lot(uuid) to service_role;

drop policy if exists "auditados can read assigned replica answers" on public.answers;
create policy "auditados can read assigned replica answers"
  on public.answers for select to authenticated
  using (public.current_app_can_read_replica_answer(id));

drop policy if exists "auditados can read assigned replica answer evidences" on public.answer_evidences;
create policy "auditados can read assigned replica answer evidences"
  on public.answer_evidences for select to authenticated
  using (public.current_app_can_read_replica_answer(answer_id));

drop policy if exists "auditados can read assigned replica controls" on public.controls;
create policy "auditados can read assigned replica controls"
  on public.controls for select to authenticated
  using (public.current_app_can_read_replica_control(id));

drop policy if exists "auditados can read assigned replica lot verticals" on public.lot_verticals;
create policy "auditados can read assigned replica lot verticals"
  on public.lot_verticals for select to authenticated
  using (public.current_app_can_read_replica_lot_vertical(id));

drop policy if exists "auditados can read assigned replica lots" on public.lots;
create policy "auditados can read assigned replica lots"
  on public.lots for select to authenticated
  using (public.current_app_can_read_replica_lot(id));

drop policy if exists "managers assigned auditors and owners can read audited notes" on public.audited_response_notes;
create policy "managers assigned auditors and owners can read audited notes"
  on public.audited_response_notes for select to authenticated
  using (
    public.current_app_is_manager()
    or user_id = public.current_app_user_id()
    or exists (
      select 1
      from public.answers a
      join public.controls c on c.id = a.control_id
      where a.id = audited_response_notes.answer_id
        and c.auditor_id = public.current_app_user_id()
    )
  );

drop policy if exists "auditados can insert own audited notes" on public.audited_response_notes;
create policy "auditados can insert own audited notes"
  on public.audited_response_notes for insert to authenticated
  with check (
    user_id = public.current_app_user_id()
    and public.current_app_can_read_replica_answer(answer_id)
  );

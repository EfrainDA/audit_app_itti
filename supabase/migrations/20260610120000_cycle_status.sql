alter table public.cycles
  add column if not exists status text not null default 'habilitado';

alter table public.cycles
  drop constraint if exists cycles_status_check;

alter table public.cycles
  add constraint cycles_status_check
  check (status in ('habilitado', 'deshabilitado'));

-- Initial schema for the Qualittyx audit application.
-- Run this migration from Supabase SQL editor or with `supabase db push`
-- after linking the project.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('admin', 'supervisor', 'auditor', 'auditado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.record_status as enum ('activo', 'inactivo');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.model_status as enum ('borrador', 'publicado', 'deprecado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.lote_status as enum ('abierto', 'cerrado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.control_status as enum ('pendiente', 'en_curso', 'en_replica', 'terminado', 'terminada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.evaluation_mode as enum ('distribuida', 'cascada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.question_response_type as enum ('cumple_no_cumple', 'cumple_intermedio_no_cumple');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.answer_value as enum ('cumple', 'no_cumple', 'intermedio', 'na');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.threshold_color as enum ('rojo', 'amarillo', 'verde');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_type as enum ('replica', 'cierre', 'ajuste', 'asignacion');
exception when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  company text,
  role public.user_role not null default 'auditor',
  status public.record_status not null default 'activo',
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ecosystem text not null,
  code text not null unique,
  zone text,
  owner_name text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  bimester integer not null check (bimester between 1 and 6),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  unique (year, bimester),
  check (end_date >= start_date)
);

create table if not exists public.thresholds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_value numeric(6,2) not null,
  max_value numeric(6,2) not null,
  color public.threshold_color not null,
  created_at timestamptz not null default now(),
  check (min_value <= max_value)
);

create table if not exists public.control_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status public.model_status not null default 'borrador',
  valid_from date,
  valid_until date,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table if not exists public.model_business_units (
  model_id uuid not null references public.control_models(id) on delete cascade,
  business_unit_id uuid not null references public.business_units(id) on delete cascade,
  primary key (model_id, business_unit_id)
);

create table if not exists public.verticals (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.control_models(id) on delete cascade,
  name text not null,
  description text,
  weight numeric(6,2) not null check (weight >= 0 and weight <= 100),
  evaluation_mode public.evaluation_mode not null default 'distribuida',
  contains_process boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.parameters (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid not null references public.verticals(id) on delete cascade,
  name text not null,
  description text,
  base_points numeric(6,2) not null default 0,
  allows_intermediate boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  parameter_id uuid not null references public.parameters(id) on delete cascade,
  text text not null,
  response_type public.question_response_type not null default 'cumple_no_cumple',
  evidence_required boolean not null default false,
  comment_required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lots (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id) on delete restrict,
  model_id uuid not null references public.control_models(id) on delete restrict,
  cycle_id uuid not null references public.cycles(id) on delete restrict,
  status public.lote_status not null default 'abierto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_unit_id, model_id, cycle_id)
);

create table if not exists public.lot_auditors (
  lot_id uuid not null references public.lots(id) on delete cascade,
  auditor_id uuid not null references public.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  primary key (lot_id, auditor_id)
);

create table if not exists public.lot_verticals (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete cascade,
  vertical_id uuid not null references public.verticals(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (lot_id, vertical_id)
);

create table if not exists public.controls (
  id uuid primary key default gen_random_uuid(),
  lot_vertical_id uuid not null references public.lot_verticals(id) on delete cascade,
  identifier text not null,
  description text,
  status public.control_status not null default 'pendiente',
  control_score numeric(6,2),
  process text,
  subprocess text,
  subprocesses text[] not null default '{}',
  corresponds_to_process boolean not null default false,
  product text,
  auditor_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lot_vertical_id, identifier),
  check (control_score is null or (control_score >= 0 and control_score <= 100))
);

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete cascade,
  control_id uuid not null references public.controls(id) on delete cascade,
  audit_date date not null default current_date,
  status public.control_status not null default 'pendiente',
  total_score numeric(6,2),
  auditor_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (control_id),
  check (total_score is null or (total_score >= 0 and total_score <= 100))
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  parameter_id uuid not null references public.parameters(id) on delete cascade,
  value public.answer_value not null,
  comment text,
  audited_people text[] not null default '{}',
  audited_roles text[] not null default '{}',
  answered_at timestamptz not null default now(),
  auditor_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (control_id, parameter_id)
);

create table if not exists public.answer_evidences (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.answers(id) on delete cascade,
  file_url text not null,
  file_name text,
  file_type text,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type public.notification_type not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_role on public.users(role);
create index if not exists idx_business_units_ecosystem on public.business_units(ecosystem);
create index if not exists idx_verticals_model_id on public.verticals(model_id);
create index if not exists idx_parameters_vertical_id on public.parameters(vertical_id);
create index if not exists idx_questions_parameter_id on public.questions(parameter_id);
create index if not exists idx_lots_cycle_id on public.lots(cycle_id);
create index if not exists idx_lots_business_unit_id on public.lots(business_unit_id);
create index if not exists idx_lot_auditors_auditor_id on public.lot_auditors(auditor_id);
create index if not exists idx_lot_verticals_lot_id on public.lot_verticals(lot_id);
create index if not exists idx_controls_lot_vertical_id on public.controls(lot_vertical_id);
create index if not exists idx_controls_auditor_id on public.controls(auditor_id);
create index if not exists idx_controls_status on public.controls(status);
create index if not exists idx_audits_lot_id on public.audits(lot_id);
create index if not exists idx_audits_auditor_id on public.audits(auditor_id);
create index if not exists idx_answers_control_id on public.answers(control_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_business_units_updated_at on public.business_units;
create trigger set_business_units_updated_at
before update on public.business_units
for each row execute function public.set_updated_at();

drop trigger if exists set_control_models_updated_at on public.control_models;
create trigger set_control_models_updated_at
before update on public.control_models
for each row execute function public.set_updated_at();

drop trigger if exists set_lots_updated_at on public.lots;
create trigger set_lots_updated_at
before update on public.lots
for each row execute function public.set_updated_at();

drop trigger if exists set_controls_updated_at on public.controls;
create trigger set_controls_updated_at
before update on public.controls
for each row execute function public.set_updated_at();

drop trigger if exists set_audits_updated_at on public.audits;
create trigger set_audits_updated_at
before update on public.audits
for each row execute function public.set_updated_at();

drop trigger if exists set_answers_updated_at on public.answers;
create trigger set_answers_updated_at
before update on public.answers
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.business_units enable row level security;
alter table public.cycles enable row level security;
alter table public.thresholds enable row level security;
alter table public.control_models enable row level security;
alter table public.model_business_units enable row level security;
alter table public.verticals enable row level security;
alter table public.parameters enable row level security;
alter table public.questions enable row level security;
alter table public.lots enable row level security;
alter table public.lot_auditors enable row level security;
alter table public.lot_verticals enable row level security;
alter table public.controls enable row level security;
alter table public.audits enable row level security;
alter table public.answers enable row level security;
alter table public.answer_evidences enable row level security;
alter table public.notifications enable row level security;

-- Development-friendly read policies. Tighten these before production.
do $$ begin
  create policy "authenticated can read users" on public.users for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read configuration" on public.business_units for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read cycles" on public.cycles for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read thresholds" on public.thresholds for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read models" on public.control_models for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read model units" on public.model_business_units for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read verticals" on public.verticals for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read parameters" on public.parameters for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read questions" on public.questions for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read lots" on public.lots for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read lot auditors" on public.lot_auditors for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read lot verticals" on public.lot_verticals for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read controls" on public.controls for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read audits" on public.audits for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage answers" on public.answers for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage answer evidences" on public.answer_evidences for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can read notifications" on public.notifications for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

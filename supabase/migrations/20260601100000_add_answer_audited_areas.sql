alter table public.answers
  add column if not exists audited_areas text[] not null default '{}';

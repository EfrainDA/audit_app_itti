drop policy if exists "anon can read questions" on public.questions;
drop policy if exists "authenticated can read questions" on public.questions;
drop policy if exists "authenticated can manage questions" on public.questions;
drop policy if exists "managers can manage questions" on public.questions;

drop table if exists public.questions;
drop type if exists public.question_response_type;

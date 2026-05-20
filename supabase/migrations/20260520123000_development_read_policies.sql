-- Development read policies for the current frontend-only Supabase client.
-- The app currently uses NEXT_PUBLIC_SUPABASE_ANON_KEY and has no auth flow yet.
-- Tighten these policies when authentication/roles are implemented.

do $$ begin
  create policy "anon can read users" on public.users for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read business units" on public.business_units for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read cycles" on public.cycles for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read thresholds" on public.thresholds for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read control models" on public.control_models for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read model business units" on public.model_business_units for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read verticals" on public.verticals for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read parameters" on public.parameters for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read questions" on public.questions for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read lots" on public.lots for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read lot auditors" on public.lot_auditors for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read lot verticals" on public.lot_verticals for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read controls" on public.controls for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read audits" on public.audits for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read answers" on public.answers for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read answer evidences" on public.answer_evidences for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon can read notifications" on public.notifications for select to anon using (true);
exception when duplicate_object then null;
end $$;

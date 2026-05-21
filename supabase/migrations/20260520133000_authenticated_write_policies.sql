-- Development write policies for the authenticated app.
-- Tighten these policies before using the project in production.

do $$ begin
  create policy "authenticated can manage users"
    on public.users for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage business units"
    on public.business_units for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage cycles"
    on public.cycles for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage thresholds"
    on public.thresholds for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage models"
    on public.control_models for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage model units"
    on public.model_business_units for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage verticals"
    on public.verticals for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage parameters"
    on public.parameters for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage questions"
    on public.questions for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage lots"
    on public.lots for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage lot auditors"
    on public.lot_auditors for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage lot verticals"
    on public.lot_verticals for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage controls"
    on public.controls for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage audits"
    on public.audits for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "authenticated can manage notifications"
    on public.notifications for all to authenticated
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;

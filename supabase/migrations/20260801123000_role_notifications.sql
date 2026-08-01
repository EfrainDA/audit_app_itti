-- Las notificaciones se originan en cambios persistidos para que no dependan
-- de una pantalla concreta ni se pierdan por cierres del navegador.

create or replace function public.create_audit_lot(payload jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  target_cycle_id uuid;
  target_lot_id uuid;
begin
  if not public.current_app_is_manager() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select id into target_cycle_id
  from public.cycles
  where year = (payload->>'year')::integer
    and bimester = (payload->>'bimester')::integer
    and coalesce(status::text, 'habilitado') = 'habilitado'
  for update;

  if target_cycle_id is null then
    raise exception 'cycle_not_enabled' using errcode = '22023';
  end if;

  insert into public.lots(business_unit_id, model_id, cycle_id, status)
  values ((payload->>'businessUnitId')::uuid, (payload->>'modelId')::uuid, target_cycle_id, 'abierto')
  returning id into target_lot_id;

  insert into public.lot_auditors(lot_id, auditor_id)
  select target_lot_id, value::uuid
  from jsonb_array_elements_text(coalesce(payload->'auditorIds', '[]'::jsonb))
  on conflict do nothing;

  insert into public.lot_verticals(lot_id, vertical_id)
  select target_lot_id, id from public.verticals
  where model_id = (payload->>'modelId')::uuid
  order by sort_order;

  return target_lot_id;
end;
$$;

create or replace function public.notify_auditor_lot_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  unit_name text;
begin
  select bu.name into unit_name
  from public.lots l
  join public.business_units bu on bu.id = l.business_unit_id
  where l.id = new.lot_id;

  insert into public.notifications(user_id, title, message, type, read)
  values (
    new.auditor_id,
    'Lote asignado',
    'Se te asignó el lote ' || coalesce(unit_name, '') || '. /planificacion/' || new.lot_id::text,
    'asignacion',
    false
  );
  return new;
end;
$$;

create trigger notify_auditor_after_lot_assignment
after insert on public.lot_auditors
for each row execute function public.notify_auditor_lot_assignment();

create or replace function public.notify_supervisors_on_control_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_lot_id uuid;
  auditor_name text;
  unit_name text;
  lot_is_complete boolean;
begin
  if new.status::text <> 'terminado' or old.status::text = 'terminado' then
    return new;
  end if;

  select lv.lot_id, u.name, bu.name
  into target_lot_id, auditor_name, unit_name
  from public.lot_verticals lv
  join public.lots l on l.id = lv.lot_id
  join public.business_units bu on bu.id = l.business_unit_id
  left join public.users u on u.id = new.auditor_id
  where lv.id = new.lot_vertical_id;

  insert into public.notifications(user_id, title, message, type, read)
  select id,
    'Auditor terminó su asignación',
    coalesce(auditor_name, 'Un auditor') || ' terminó el control ' || new.identifier ||
      ' del lote ' || coalesce(unit_name, '') || '. /planificacion/' || target_lot_id::text,
    'cierre', false
  from public.users
  where role = 'supervisor' and status = 'activo';

  select exists(select 1 from public.controls c join public.lot_verticals lv on lv.id = c.lot_vertical_id where lv.lot_id = target_lot_id)
    and not exists(select 1 from public.controls c join public.lot_verticals lv on lv.id = c.lot_vertical_id where lv.lot_id = target_lot_id and c.status::text <> 'terminado')
  into lot_is_complete;

  if lot_is_complete then
    insert into public.notifications(user_id, title, message, type, read)
    select id,
      'Lote completado al 100%',
      'Todas las auditorías del lote ' || coalesce(unit_name, '') ||
        ' fueron completadas. /planificacion/' || target_lot_id::text,
      'cierre', false
    from public.users
    where role = 'supervisor' and status = 'activo';
  end if;
  return new;
end;
$$;

create trigger notify_supervisors_after_control_completion
after update of status on public.controls
for each row execute function public.notify_supervisors_on_control_completion();

-- Cada usuario solo puede consultar y marcar sus propias notificaciones. Las
-- inserciones quedan reservadas a los triggers SECURITY DEFINER anteriores.
drop policy if exists "authenticated can read notifications" on public.notifications;
drop policy if exists "managers and owners can read notifications" on public.notifications;
drop policy if exists "managers and owners can update notifications" on public.notifications;
drop policy if exists "active managers and auditors can insert notifications" on public.notifications;

create policy "owners can read notifications"
on public.notifications for select to authenticated
using (public.current_app_is_active() and user_id = public.current_app_user_id());

create policy "owners can update notifications"
on public.notifications for update to authenticated
using (public.current_app_is_active() and user_id = public.current_app_user_id())
with check (public.current_app_is_active() and user_id = public.current_app_user_id());

-- Un lote cerrado o dado de baja conserva su estructura como historial inmutable.
create or replace function public.reject_closed_lot_structure_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_lot_id uuid;
  target_status text;
begin
  if tg_table_name = 'controls' then
    select lv.lot_id into target_lot_id
    from public.lot_verticals lv
    where lv.id = coalesce(new.lot_vertical_id, old.lot_vertical_id);
  elsif tg_table_name = 'lot_verticals' then
    target_lot_id := coalesce(new.lot_id, old.lot_id);
  elsif tg_table_name = 'lot_auditors' then
    target_lot_id := coalesce(new.lot_id, old.lot_id);
  end if;

  select l.status::text into target_status from public.lots l where l.id = target_lot_id;
  if target_status is distinct from 'abierto' then
    raise exception 'El lote ya no está abierto y no admite modificaciones.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger controls_require_open_lot
before insert or update or delete on public.controls
for each row execute function public.reject_closed_lot_structure_change();

create trigger lot_verticals_require_open_lot
before insert or update or delete on public.lot_verticals
for each row execute function public.reject_closed_lot_structure_change();

create trigger lot_auditors_require_open_lot
before insert or update or delete on public.lot_auditors
for each row execute function public.reject_closed_lot_structure_change();

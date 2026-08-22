-- Un lote abierto admite respuestas aunque las fechas de su ciclo hayan pasado.
-- Cerrar o dar de baja el lote sigue siendo el bloqueo operativo explícito.
create or replace function public.save_evaluation(
  p_control_id uuid,
  p_lot_id uuid,
  p_answers jsonb,
  p_finalize boolean default false,
  p_score numeric default null
) returns void
language plpgsql
set search_path to 'public'
as $$
declare
  actor_id uuid := public.current_app_user_id();
  answer_item jsonb;
  target_lot_id uuid;
begin
  select lv.lot_id into target_lot_id
  from public.controls c
  join public.lot_verticals lv on lv.id = c.lot_vertical_id
  join public.lots l on l.id = lv.lot_id
  where c.id = p_control_id
    and l.status = 'abierto'
    and c.auditor_id = actor_id
  for update of c;

  if target_lot_id is null or (p_lot_id is not null and target_lot_id <> p_lot_id) then
    raise exception 'control_not_evaluable' using errcode = '42501';
  end if;

  for answer_item in
    select value from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    insert into public.answers(
      control_id, parameter_id, value, comment, audited_people,
      audited_roles, audited_areas, answered_at, auditor_id
    )
    values (
      p_control_id,
      (answer_item->>'parametroId')::uuid,
      nullif(answer_item->>'valor', '')::public.answer_value,
      nullif(trim(answer_item->>'comentario'), ''),
      array(select jsonb_array_elements_text(coalesce(answer_item->'personasAuditadas', '[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(answer_item->'cargos', '[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(answer_item->'areas', '[]'::jsonb))),
      coalesce((answer_item->>'fechaRespuesta')::timestamptz, now()),
      actor_id
    )
    on conflict (control_id, parameter_id) do update set
      value = excluded.value,
      comment = excluded.comment,
      audited_people = excluded.audited_people,
      audited_roles = excluded.audited_roles,
      audited_areas = excluded.audited_areas,
      answered_at = excluded.answered_at,
      auditor_id = excluded.auditor_id,
      updated_at = now();
  end loop;

  if p_finalize then
    update public.controls
    set status = 'terminado', control_score = p_score, auditor_id = actor_id, updated_at = now()
    where id = p_control_id;

    insert into public.audits(lot_id, control_id, audit_date, status, total_score, auditor_id)
    values (target_lot_id, p_control_id, current_date, 'terminado', p_score, actor_id)
    on conflict (control_id) do update set
      status = excluded.status,
      total_score = excluded.total_score,
      auditor_id = excluded.auditor_id,
      audit_date = excluded.audit_date,
      updated_at = now();
  end if;
end;
$$;

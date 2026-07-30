


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






-- Enumeraciones que restringen estados y valores funcionales.
CREATE TYPE "public"."answer_value" AS ENUM (
    'cumple',
    'no_cumple',
    'intermedio',
    'na'
);


ALTER TYPE "public"."answer_value" OWNER TO "postgres";


CREATE TYPE "public"."control_status" AS ENUM (
    'pendiente',
    'en_curso',
    'terminado',
    'terminada'
);


ALTER TYPE "public"."control_status" OWNER TO "postgres";


CREATE TYPE "public"."evaluation_mode" AS ENUM (
    'distribuida',
    'cascada'
);


ALTER TYPE "public"."evaluation_mode" OWNER TO "postgres";


CREATE TYPE "public"."lote_status" AS ENUM (
    'abierto',
    'cerrado',
    'deprecado'
);


ALTER TYPE "public"."lote_status" OWNER TO "postgres";


CREATE TYPE "public"."model_status" AS ENUM (
    'borrador',
    'publicado',
    'deprecado'
);


ALTER TYPE "public"."model_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'cierre',
    'ajuste',
    'asignacion'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."record_status" AS ENUM (
    'activo',
    'inactivo'
);


ALTER TYPE "public"."record_status" OWNER TO "postgres";


CREATE TYPE "public"."threshold_color" AS ENUM (
    'rojo',
    'amarillo',
    'verde'
);


ALTER TYPE "public"."threshold_color" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'ceo',
    'supervisor',
    'auditor'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


-- RPC transaccional para crear un lote con auditores y verticales.
CREATE OR REPLACE FUNCTION "public"."create_audit_lot"("payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
  values (
    (payload->>'businessUnitId')::uuid,
    (payload->>'modelId')::uuid,
    target_cycle_id,
    'abierto'
  )
  returning id into target_lot_id;

  insert into public.lot_auditors(lot_id, auditor_id)
  select target_lot_id, value::uuid
  from jsonb_array_elements_text(coalesce(payload->'auditorIds', '[]'::jsonb))
  on conflict do nothing;

  insert into public.lot_verticals(lot_id, vertical_id)
  select target_lot_id, id
  from public.verticals
  where model_id = (payload->>'modelId')::uuid
  order by sort_order;

  insert into public.notifications(user_id, title, message, type, read)
  select
    value::uuid,
    'Lote asignado',
    'Se te ha asignado un lote. Ve a evaluaciones para comenzar.',
    'asignacion',
    false
  from jsonb_array_elements_text(coalesce(payload->'auditorIds', '[]'::jsonb));

  return target_lot_id;
end;
$$;


ALTER FUNCTION "public"."create_audit_lot"("payload" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


-- Períodos configurables usados por planificación, evaluación y dashboards.
CREATE TABLE IF NOT EXISTS "public"."cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "bimester" integer NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'habilitado'::"text" NOT NULL,
    "start_month" integer NOT NULL,
    "end_month" integer NOT NULL,
    CONSTRAINT "cycles_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "cycles_month_range_check" CHECK (("start_month" BETWEEN 1 AND 12) AND ("end_month" BETWEEN "start_month" AND 12)),
    CONSTRAINT "cycles_sequence_check" CHECK ((("bimester" >= 1) AND ("bimester" <= 99))),
    CONSTRAINT "cycles_status_check" CHECK (("status" = ANY (ARRAY['habilitado'::"text", 'deshabilitado'::"text"])))
);


ALTER TABLE "public"."cycles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_cycle"("cycle_year" integer, "cycle_start_month" integer, "cycle_end_month" integer, "cycle_start_date" "date", "cycle_end_date" "date") RETURNS "public"."cycles"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  created_cycle public.cycles;
  next_sequence integer;
begin
  if not public.current_app_is_manager() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if cycle_year not between 2020 and 2100
    or cycle_start_month not between 1 and 12
    or cycle_end_month not between cycle_start_month and 12 then
    raise exception 'invalid_cycle_range' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('cycles:' || cycle_year::text));

  select coalesce(max(bimester), 0) + 1
  into next_sequence
  from public.cycles
  where year = cycle_year;

  insert into public.cycles (
    year,
    bimester,
    start_month,
    end_month,
    start_date,
    end_date,
    status
  )
  values (
    cycle_year,
    next_sequence,
    cycle_start_month,
    cycle_end_month,
    cycle_start_date,
    cycle_end_date,
    'habilitado'
  )
  returning * into created_cycle;

  return created_cycle;
end;
$$;


ALTER FUNCTION "public"."create_cycle"("cycle_year" integer, "cycle_start_month" integer, "cycle_end_month" integer, "cycle_start_date" "date", "cycle_end_date" "date") OWNER TO "postgres";


-- Funciones auxiliares de identidad y alcance reutilizadas por las políticas RLS.
CREATE OR REPLACE FUNCTION "public"."current_app_can_read_lot"("target_lot_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_is_manager()
    or exists (
      select 1
      from public.lot_auditors la
      where la.lot_id = target_lot_id
        and la.auditor_id = public.current_app_user_id()
    );
$$;


ALTER FUNCTION "public"."current_app_can_read_lot"("target_lot_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_is_active"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.status = 'activo'
  );
$$;


ALTER FUNCTION "public"."current_app_is_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_is_active()
    and coalesce(public.current_app_role() = 'admin', false);
$$;


ALTER FUNCTION "public"."current_app_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_is_manager"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.current_app_is_active()
    and coalesce(public.current_app_role() in ('admin', 'supervisor'), false);
$$;


ALTER FUNCTION "public"."current_app_is_manager"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.role::text
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.status = 'activo'
  limit 1;
$$;


ALTER FUNCTION "public"."current_app_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_shares_lot_with_auditor"("target_auditor_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.lot_auditors current_assignment
    join public.lot_auditors target_assignment
      on target_assignment.lot_id = current_assignment.lot_id
    where current_assignment.auditor_id = public.current_app_user_id()
      and target_assignment.auditor_id = target_auditor_id
  );
$$;


ALTER FUNCTION "public"."current_app_shares_lot_with_auditor"("target_auditor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.status = 'activo'
  limit 1;
$$;


ALTER FUNCTION "public"."current_app_user_id"() OWNER TO "postgres";


-- Agregación ejecutiva en servidor para evitar transferir respuestas individuales.
CREATE OR REPLACE FUNCTION "public"."get_executive_dashboard"("p_cycle_id" "uuid" DEFAULT NULL::"uuid", "p_ecosystem" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  with facts as (
    select *
    from public.dashboard_control_facts
    where (p_cycle_id is null or cycle_id = p_cycle_id)
      and (p_ecosystem is null or ecosystem = p_ecosystem)
  ),
  totals as (
    select
      count(*) as controls,
      count(*) filter (where status::text in ('terminado', 'terminada')) as completed,
      round(avg(control_score) filter (where control_score is not null), 2) as average_score,
      coalesce(sum(cumple), 0) as cumple,
      coalesce(sum(intermedio), 0) as intermedio,
      coalesce(sum(no_cumple), 0) as no_cumple,
      coalesce(sum(na), 0) as na
    from facts
  ),
  units as (
    select jsonb_agg(jsonb_build_object(
      'businessUnitId', business_unit_id,
      'controls', controls,
      'completed', completed,
      'averageScore', average_score
    ) order by business_unit_id) as value
    from (
      select business_unit_id, count(*) controls,
        count(*) filter (where status::text in ('terminado', 'terminada')) completed,
        round(avg(control_score) filter (where control_score is not null), 2) average_score
      from facts group by business_unit_id
    ) grouped
  ),
  verticals as (
    select jsonb_agg(jsonb_build_object(
      'verticalId', vertical_id,
      'controls', controls,
      'completed', completed,
      'averageScore', average_score
    ) order by vertical_id) as value
    from (
      select vertical_id, count(*) controls,
        count(*) filter (where status::text in ('terminado', 'terminada')) completed,
        round(avg(control_score) filter (where control_score is not null), 2) average_score
      from facts group by vertical_id
    ) grouped
  )
  select jsonb_build_object(
    'totals', to_jsonb(totals),
    'byBusinessUnit', coalesce(units.value, '[]'::jsonb),
    'byVertical', coalesce(verticals.value, '[]'::jsonb)
  )
  from totals cross join units cross join verticals;
$$;


ALTER FUNCTION "public"."get_executive_dashboard"("p_cycle_id" "uuid", "p_ecosystem" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.users
    set
      auth_user_id = new.id,
      company = coalesce(nullif(new.raw_user_meta_data->>'company', ''), nullif(new.raw_user_meta_data->>'empresa', ''), company),
      cargo = coalesce(nullif(new.raw_user_meta_data->>'cargo', ''), cargo),
      area = coalesce(nullif(new.raw_user_meta_data->>'area', ''), area)
  where lower(email) = lower(new.email)
    and auth_user_id is null;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_catalog_name"("value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    SET "search_path" TO ''
    AS $$
  select lower(
    regexp_replace(
      translate(trim(value), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'),
      '\s+',
      ' ',
      'g'
    )
  );
$$;


ALTER FUNCTION "public"."normalize_catalog_name"("value" "text") OWNER TO "postgres";


-- Escritura atómica de catálogo y vínculos multiproducto.
CREATE OR REPLACE FUNCTION "public"."save_catalog_item"("payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  target_id uuid;
  linked_ids uuid[];
  subprocess_values text[];
begin
  if not public.current_app_is_manager() then
    raise exception 'No autorizado para administrar el catálogo.'
      using errcode = '42501';
  end if;

  select coalesce(array_agg(linked.value::uuid), '{}')
  into linked_ids
  from jsonb_array_elements_text(coalesce(payload->'linkedProductIds', '[]'::jsonb)) as linked(value);

  select coalesce(array_agg(subprocess.value), '{}')
  into subprocess_values
  from jsonb_array_elements_text(coalesce(payload->'subprocesses', '[]'::jsonb)) as subprocess(value);

  if nullif(payload->>'id', '') is null then
    insert into public.catalog_items (
      category,
      name,
      description,
      subprocesses,
      business_unit_id,
      linked_product_id,
      created_by
    )
    values (
      payload->>'category',
      trim(payload->>'name'),
      nullif(trim(coalesce(payload->>'description', '')), ''),
      case when payload->>'category' = 'proceso' then subprocess_values else '{}'::text[] end,
      nullif(payload->>'businessUnitId', '')::uuid,
      case when payload->>'category' = 'proceso' then linked_ids[1] else null end,
      public.current_app_user_id()
    )
    returning id into target_id;
  else
    target_id := (payload->>'id')::uuid;

    delete from public.catalog_process_products
    where process_id = target_id;

    update public.catalog_items
    set
      category = payload->>'category',
      name = trim(payload->>'name'),
      description = nullif(trim(coalesce(payload->>'description', '')), ''),
      subprocesses = case when payload->>'category' = 'proceso' then subprocess_values else '{}'::text[] end,
      business_unit_id = nullif(payload->>'businessUnitId', '')::uuid,
      linked_product_id = case when payload->>'category' = 'proceso' then linked_ids[1] else null end
    where id = target_id;

    if not found then
      raise exception 'El registro del catálogo no existe.'
        using errcode = 'P0002';
    end if;
  end if;

  delete from public.catalog_process_products
  where process_id = target_id;

  if payload->>'category' = 'proceso' then
    insert into public.catalog_process_products (process_id, product_id)
    select target_id, product_id
    from unnest(linked_ids) product_id
    on conflict do nothing;
  end if;

  return target_id;
end;
$$;


ALTER FUNCTION "public"."save_catalog_item"("payload" "jsonb") OWNER TO "postgres";


-- Borrador o cierre atómico de respuestas, auditoría y control.
CREATE OR REPLACE FUNCTION "public"."save_evaluation"("p_control_id" "uuid", "p_lot_id" "uuid", "p_answers" "jsonb", "p_finalize" boolean DEFAULT false, "p_score" numeric DEFAULT NULL::numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  actor_id uuid := public.current_app_user_id();
  answer_item jsonb;
  target_lot_id uuid;
begin
  select lv.lot_id into target_lot_id
  from public.controls c
  join public.lot_verticals lv on lv.id = c.lot_vertical_id
  join public.lots l on l.id = lv.lot_id
  join public.cycles cy on cy.id = l.cycle_id
  where c.id = p_control_id
    and l.status = 'abierto'
    and coalesce(cy.status::text, 'habilitado') = 'habilitado'
    and current_date between cy.start_date and cy.end_date
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


ALTER FUNCTION "public"."save_evaluation"("p_control_id" "uuid", "p_lot_id" "uuid", "p_answers" "jsonb", "p_finalize" boolean, "p_score" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_catalog_item_scope"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  linked_product public.catalog_items%rowtype;
begin
  if new.category <> 'area_transversal' and new.business_unit_id is null then
    raise exception 'Los productos, procesos y otros deben pertenecer a una unidad de negocio.'
      using errcode = '23514';
  end if;

  if new.linked_product_id is not null then
    select *
    into linked_product
    from public.catalog_items
    where id = new.linked_product_id;

    if linked_product.id is null
      or linked_product.category <> 'producto'
      or linked_product.business_unit_id is distinct from new.business_unit_id then
      raise exception 'El producto vinculado debe pertenecer a la misma unidad de negocio.'
        using errcode = '23514';
    end if;
  end if;

  if new.category = 'producto' and exists (
    select 1
    from public.catalog_items process_item
    where process_item.linked_product_id = new.id
      and process_item.business_unit_id is distinct from new.business_unit_id
  ) then
    raise exception 'No se puede cambiar la unidad de un producto vinculado a procesos de otra unidad.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_catalog_item_scope"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_catalog_multi_product_scope"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.category = 'proceso' and exists (
    select 1
    from public.catalog_process_products relation
    join public.catalog_items product on product.id = relation.product_id
    where relation.process_id = new.id
      and product.business_unit_id is distinct from new.business_unit_id
  ) then
    raise exception 'No se puede cambiar la unidad del proceso porque tiene productos vinculados de otra unidad.'
      using errcode = '23514';
  end if;

  if new.category = 'producto' and exists (
    select 1
    from public.catalog_process_products relation
    join public.catalog_items process on process.id = relation.process_id
    where relation.product_id = new.id
      and process.business_unit_id is distinct from new.business_unit_id
  ) then
    raise exception 'No se puede cambiar la unidad del producto porque está vinculado a procesos de otra unidad.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_catalog_multi_product_scope"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_catalog_process_product"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  process_item public.catalog_items%rowtype;
  product_item public.catalog_items%rowtype;
begin
  select * into process_item
  from public.catalog_items
  where id = new.process_id;

  select * into product_item
  from public.catalog_items
  where id = new.product_id;

  if process_item.category <> 'proceso'
    or product_item.category <> 'producto'
    or process_item.business_unit_id is distinct from product_item.business_unit_id then
    raise exception 'Los productos vinculados deben pertenecer a la misma unidad que el proceso.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_catalog_process_product"() OWNER TO "postgres";


-- Tablas funcionales del sistema.
CREATE TABLE IF NOT EXISTS "public"."answer_evidences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "answer_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_name" "text",
    "file_type" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."answer_evidences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "control_id" "uuid" NOT NULL,
    "parameter_id" "uuid" NOT NULL,
    "value" "public"."answer_value",
    "comment" "text",
    "audited_people" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "audited_roles" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "answered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auditor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "audited_areas" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


ALTER TABLE "public"."answers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."answers"."audited_areas" IS 'Areas associated with the audited people for an evaluation answer.';



CREATE TABLE IF NOT EXISTS "public"."audits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lot_id" "uuid" NOT NULL,
    "control_id" "uuid" NOT NULL,
    "audit_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "status" "public"."control_status" DEFAULT 'pendiente'::"public"."control_status" NOT NULL,
    "total_score" numeric(6,2),
    "auditor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audits_total_score_check" CHECK ((("total_score" IS NULL) OR (("total_score" >= (0)::numeric) AND ("total_score" <= (100)::numeric))))
);


ALTER TABLE "public"."audits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "ecosystem" "text" NOT NULL,
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."business_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalog_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "subprocesses" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "public"."record_status" DEFAULT 'activo'::"public"."record_status" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "business_unit_id" "uuid",
    "linked_product_id" "uuid",
    CONSTRAINT "catalog_items_business_scope_check" CHECK (((("category" = 'area_transversal'::"text") AND ("business_unit_id" IS NULL)) OR ("category" <> 'area_transversal'::"text"))),
    CONSTRAINT "catalog_items_category_check" CHECK (("category" = ANY (ARRAY['producto'::"text", 'proceso'::"text", 'otro'::"text", 'area_transversal'::"text"]))),
    CONSTRAINT "catalog_items_linked_product_check" CHECK ((("category" = 'proceso'::"text") OR ("linked_product_id" IS NULL))),
    CONSTRAINT "catalog_items_name_check" CHECK (("char_length"(TRIM(BOTH FROM "name")) >= 2)),
    CONSTRAINT "catalog_items_subprocesses_check" CHECK ((("category" = 'proceso'::"text") OR ("cardinality"("subprocesses") = 0)))
);


ALTER TABLE "public"."catalog_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalog_process_products" (
    "process_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "catalog_process_products_distinct_check" CHECK (("process_id" <> "product_id"))
);


ALTER TABLE "public"."catalog_process_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."control_models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "public"."model_status" DEFAULT 'borrador'::"public"."model_status" NOT NULL,
    "valid_from" "date",
    "valid_until" "date",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "control_models_check" CHECK ((("valid_until" IS NULL) OR ("valid_from" IS NULL) OR ("valid_until" >= "valid_from")))
);


ALTER TABLE "public"."control_models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."controls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lot_vertical_id" "uuid" NOT NULL,
    "identifier" "text" NOT NULL,
    "description" "text",
    "status" "public"."control_status" DEFAULT 'pendiente'::"public"."control_status" NOT NULL,
    "control_score" numeric(6,2),
    "process" "text",
    "subprocess" "text",
    "subprocesses" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "corresponds_to_process" boolean DEFAULT false NOT NULL,
    "product" "text",
    "auditor_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tag" "text",
    "linked_products" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "catalog_item_id" "uuid",
    CONSTRAINT "controls_control_score_check" CHECK ((("control_score" IS NULL) OR (("control_score" >= (0)::numeric) AND ("control_score" <= (100)::numeric))))
);


ALTER TABLE "public"."controls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lot_verticals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lot_id" "uuid" NOT NULL,
    "vertical_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lot_verticals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_unit_id" "uuid" NOT NULL,
    "model_id" "uuid" NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "status" "public"."lote_status" DEFAULT 'abierto'::"public"."lote_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lots" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dashboard_control_facts" WITH ("security_invoker"='true') AS
 SELECT "c"."id" AS "control_id",
    "c"."created_at",
    "l"."id" AS "lot_id",
    "l"."cycle_id",
    "l"."business_unit_id",
    "bu"."ecosystem",
    "lv"."vertical_id",
    "c"."status",
    "c"."control_score",
    COALESCE("a"."cumple", (0)::bigint) AS "cumple",
    COALESCE("a"."intermedio", (0)::bigint) AS "intermedio",
    COALESCE("a"."no_cumple", (0)::bigint) AS "no_cumple",
    COALESCE("a"."na", (0)::bigint) AS "na"
   FROM (((("public"."controls" "c"
     JOIN "public"."lot_verticals" "lv" ON (("lv"."id" = "c"."lot_vertical_id")))
     JOIN "public"."lots" "l" ON ((("l"."id" = "lv"."lot_id") AND ("l"."status" <> 'deprecado'::"public"."lote_status"))))
     JOIN "public"."business_units" "bu" ON (("bu"."id" = "l"."business_unit_id")))
     LEFT JOIN LATERAL ( SELECT "count"(*) FILTER (WHERE ("ans"."value" = 'cumple'::"public"."answer_value")) AS "cumple",
            "count"(*) FILTER (WHERE ("ans"."value" = 'intermedio'::"public"."answer_value")) AS "intermedio",
            "count"(*) FILTER (WHERE ("ans"."value" = 'no_cumple'::"public"."answer_value")) AS "no_cumple",
            "count"(*) FILTER (WHERE ("ans"."value" = 'na'::"public"."answer_value")) AS "na"
           FROM "public"."answers" "ans"
          WHERE ("ans"."control_id" = "c"."id")) "a" ON (true));


ALTER VIEW "public"."dashboard_control_facts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lot_auditors" (
    "lot_id" "uuid" NOT NULL,
    "auditor_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lot_auditors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."model_business_units" (
    "model_id" "uuid" NOT NULL,
    "business_unit_id" "uuid" NOT NULL
);


ALTER TABLE "public"."model_business_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parameters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vertical_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "base_points" numeric(6,2) DEFAULT 0 NOT NULL,
    "allows_intermediate" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."parameters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."thresholds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "min_value" numeric(6,2) NOT NULL,
    "max_value" numeric(6,2) NOT NULL,
    "color" "public"."threshold_color" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "thresholds_check" CHECK (("min_value" <= "max_value"))
);


ALTER TABLE "public"."thresholds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'auditor'::"public"."user_role" NOT NULL,
    "status" "public"."record_status" DEFAULT 'activo'::"public"."record_status" NOT NULL,
    "avatar" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company" "text",
    "cargo" "text",
    "area" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."verticals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "model_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "weight" numeric(6,2) NOT NULL,
    "evaluation_mode" "public"."evaluation_mode" DEFAULT 'distribuida'::"public"."evaluation_mode" NOT NULL,
    "contains_process" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "verticals_weight_check" CHECK ((("weight" >= (0)::numeric) AND ("weight" <= (100)::numeric)))
);


ALTER TABLE "public"."verticals" OWNER TO "postgres";


-- Claves primarias y restricciones de unicidad.
ALTER TABLE ONLY "public"."answer_evidences"
    ADD CONSTRAINT "answer_evidences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_control_id_parameter_id_key" UNIQUE ("control_id", "parameter_id");



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "audits_control_id_key" UNIQUE ("control_id");



ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "audits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_units"
    ADD CONSTRAINT "business_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_items"
    ADD CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_process_products"
    ADD CONSTRAINT "catalog_process_products_pkey" PRIMARY KEY ("process_id", "product_id");



ALTER TABLE ONLY "public"."control_models"
    ADD CONSTRAINT "control_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."controls"
    ADD CONSTRAINT "controls_lot_vertical_id_identifier_key" UNIQUE ("lot_vertical_id", "identifier");



ALTER TABLE ONLY "public"."controls"
    ADD CONSTRAINT "controls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycles"
    ADD CONSTRAINT "cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycles"
    ADD CONSTRAINT "cycles_year_bimester_key" UNIQUE ("year", "bimester");



ALTER TABLE ONLY "public"."cycles"
    ADD CONSTRAINT "cycles_year_month_range_key" UNIQUE ("year", "start_month", "end_month");



ALTER TABLE ONLY "public"."lot_auditors"
    ADD CONSTRAINT "lot_auditors_pkey" PRIMARY KEY ("lot_id", "auditor_id");



ALTER TABLE ONLY "public"."lot_verticals"
    ADD CONSTRAINT "lot_verticals_lot_id_vertical_id_key" UNIQUE ("lot_id", "vertical_id");



ALTER TABLE ONLY "public"."lot_verticals"
    ADD CONSTRAINT "lot_verticals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lots"
    ADD CONSTRAINT "lots_business_unit_id_model_id_cycle_id_key" UNIQUE ("business_unit_id", "model_id", "cycle_id");



ALTER TABLE ONLY "public"."lots"
    ADD CONSTRAINT "lots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."model_business_units"
    ADD CONSTRAINT "model_business_units_pkey" PRIMARY KEY ("model_id", "business_unit_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parameters"
    ADD CONSTRAINT "parameters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."thresholds"
    ADD CONSTRAINT "thresholds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verticals"
    ADD CONSTRAINT "verticals_pkey" PRIMARY KEY ("id");



-- Índices para relaciones frecuentes, filtros y paginación.
CREATE INDEX "answers_control_value_idx" ON "public"."answers" USING "btree" ("control_id", "value");



CREATE INDEX "controls_created_at_id_cursor_idx" ON "public"."controls" USING "btree" ("created_at" DESC, "id" DESC);



CREATE INDEX "controls_status_score_idx" ON "public"."controls" USING "btree" ("status", "control_score");



CREATE INDEX "idx_answers_control_id" ON "public"."answers" USING "btree" ("control_id");



CREATE INDEX "idx_audits_auditor_id" ON "public"."audits" USING "btree" ("auditor_id");



CREATE INDEX "idx_audits_lot_id" ON "public"."audits" USING "btree" ("lot_id");



CREATE INDEX "idx_business_units_ecosystem" ON "public"."business_units" USING "btree" ("ecosystem");



CREATE INDEX "idx_catalog_items_business_unit" ON "public"."catalog_items" USING "btree" ("business_unit_id", "category", "status", "name");



CREATE INDEX "idx_catalog_items_category_status_name" ON "public"."catalog_items" USING "btree" ("category", "status", "name");



CREATE INDEX "idx_catalog_items_linked_product" ON "public"."catalog_items" USING "btree" ("linked_product_id") WHERE ("linked_product_id" IS NOT NULL);



CREATE INDEX "idx_catalog_process_products_product" ON "public"."catalog_process_products" USING "btree" ("product_id", "process_id");



CREATE INDEX "idx_controls_auditor_id" ON "public"."controls" USING "btree" ("auditor_id");



CREATE INDEX "idx_controls_catalog_item_id" ON "public"."controls" USING "btree" ("catalog_item_id") WHERE ("catalog_item_id" IS NOT NULL);



CREATE INDEX "idx_controls_lot_vertical_id" ON "public"."controls" USING "btree" ("lot_vertical_id");



CREATE INDEX "idx_controls_status" ON "public"."controls" USING "btree" ("status");



CREATE INDEX "idx_lot_auditors_auditor_id" ON "public"."lot_auditors" USING "btree" ("auditor_id");



CREATE INDEX "idx_lot_verticals_lot_id" ON "public"."lot_verticals" USING "btree" ("lot_id");



CREATE INDEX "idx_lots_business_unit_id" ON "public"."lots" USING "btree" ("business_unit_id");



CREATE INDEX "idx_lots_cycle_id" ON "public"."lots" USING "btree" ("cycle_id");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_parameters_vertical_id" ON "public"."parameters" USING "btree" ("vertical_id");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_verticals_model_id" ON "public"."verticals" USING "btree" ("model_id");



CREATE UNIQUE INDEX "uq_catalog_items_scope_normalized_name" ON "public"."catalog_items" USING "btree" ("category", COALESCE("business_unit_id", '00000000-0000-0000-0000-000000000000'::"uuid"), "public"."normalize_catalog_name"("name"));



-- Triggers de auditoría temporal y consistencia del catálogo.
CREATE OR REPLACE TRIGGER "set_answers_updated_at" BEFORE UPDATE ON "public"."answers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_audits_updated_at" BEFORE UPDATE ON "public"."audits" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_business_units_updated_at" BEFORE UPDATE ON "public"."business_units" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_catalog_items_updated_at" BEFORE UPDATE ON "public"."catalog_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_control_models_updated_at" BEFORE UPDATE ON "public"."control_models" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_controls_updated_at" BEFORE UPDATE ON "public"."controls" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_lots_updated_at" BEFORE UPDATE ON "public"."lots" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "validate_catalog_item_scope" BEFORE INSERT OR UPDATE ON "public"."catalog_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_catalog_item_scope"();



CREATE OR REPLACE TRIGGER "validate_catalog_multi_product_scope" BEFORE UPDATE ON "public"."catalog_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_catalog_multi_product_scope"();



CREATE OR REPLACE TRIGGER "validate_catalog_process_product" BEFORE INSERT OR UPDATE ON "public"."catalog_process_products" FOR EACH ROW EXECUTE FUNCTION "public"."validate_catalog_process_product"();



-- Claves foráneas que preservan la integridad entre dominios.
ALTER TABLE ONLY "public"."answer_evidences"
    ADD CONSTRAINT "answer_evidences_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "public"."parameters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "audits_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "audits_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "audits_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalog_items"
    ADD CONSTRAINT "catalog_items_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."catalog_items"
    ADD CONSTRAINT "catalog_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."catalog_items"
    ADD CONSTRAINT "catalog_items_linked_product_id_fkey" FOREIGN KEY ("linked_product_id") REFERENCES "public"."catalog_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."catalog_process_products"
    ADD CONSTRAINT "catalog_process_products_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."catalog_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catalog_process_products"
    ADD CONSTRAINT "catalog_process_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."control_models"
    ADD CONSTRAINT "control_models_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."controls"
    ADD CONSTRAINT "controls_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."controls"
    ADD CONSTRAINT "controls_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."controls"
    ADD CONSTRAINT "controls_lot_vertical_id_fkey" FOREIGN KEY ("lot_vertical_id") REFERENCES "public"."lot_verticals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lot_auditors"
    ADD CONSTRAINT "lot_auditors_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."lot_auditors"
    ADD CONSTRAINT "lot_auditors_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lot_verticals"
    ADD CONSTRAINT "lot_verticals_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lot_verticals"
    ADD CONSTRAINT "lot_verticals_vertical_id_fkey" FOREIGN KEY ("vertical_id") REFERENCES "public"."verticals"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."lots"
    ADD CONSTRAINT "lots_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."lots"
    ADD CONSTRAINT "lots_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."lots"
    ADD CONSTRAINT "lots_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."control_models"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."model_business_units"
    ADD CONSTRAINT "model_business_units_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."model_business_units"
    ADD CONSTRAINT "model_business_units_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."control_models"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parameters"
    ADD CONSTRAINT "parameters_vertical_id_fkey" FOREIGN KEY ("vertical_id") REFERENCES "public"."verticals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."verticals"
    ADD CONSTRAINT "verticals_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."control_models"("id") ON DELETE CASCADE;



-- Políticas RLS: lectura, escritura y alcance por rol, lote o respuesta.
CREATE POLICY "active app users can read business units" ON "public"."business_units" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_active"()));



CREATE POLICY "active app users can read catalog items" ON "public"."catalog_items" FOR SELECT TO "authenticated" USING ("public"."current_app_is_active"());



CREATE POLICY "active app users can read catalog process products" ON "public"."catalog_process_products" FOR SELECT TO "authenticated" USING ("public"."current_app_is_active"());



CREATE POLICY "active app users can read cycles" ON "public"."cycles" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_active"()));



CREATE POLICY "active app users can read model units" ON "public"."model_business_units" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_active"()));



CREATE POLICY "active app users can read models" ON "public"."control_models" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_active"()));



CREATE POLICY "active app users can read parameters" ON "public"."parameters" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_active"()));



CREATE POLICY "active app users can read permitted users" ON "public"."users" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR ("auth_user_id" = "auth"."uid"()) OR (("public"."current_app_role"() = 'auditor'::"text") AND ("role" = 'auditor'::"public"."user_role") AND "public"."current_app_shares_lot_with_auditor"("id")))));



CREATE POLICY "active app users can read thresholds" ON "public"."thresholds" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_active"()));



CREATE POLICY "active app users can read verticals" ON "public"."verticals" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_active"()));



CREATE POLICY "active managers and auditors can insert notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_app_is_active"() AND ("public"."current_app_is_active"() AND ("public"."current_app_role"() = ANY (ARRAY['admin'::"text", 'supervisor'::"text", 'auditor'::"text"])))));



CREATE POLICY "admins can manage users" ON "public"."users" TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_admin"())) WITH CHECK (("public"."current_app_is_active"() AND "public"."current_app_is_admin"()));



ALTER TABLE "public"."answer_evidences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assigned auditors can read controls" ON "public"."controls" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM ("public"."lot_verticals" "lv"
     JOIN "public"."lot_auditors" "la" ON (("la"."lot_id" = "lv"."lot_id")))
  WHERE (("lv"."id" = "controls"."lot_vertical_id") AND ("la"."auditor_id" = "public"."current_app_user_id"())))))));



CREATE POLICY "assigned auditors can update own answers" ON "public"."answers" FOR UPDATE TO "authenticated" USING (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR ("auditor_id" = "public"."current_app_user_id"())))) WITH CHECK (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR (("auditor_id" = "public"."current_app_user_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."controls" "c"
  WHERE (("c"."id" = "answers"."control_id") AND ("c"."auditor_id" = "public"."current_app_user_id"()))))))));



CREATE POLICY "assigned auditors can update own audits" ON "public"."audits" FOR UPDATE TO "authenticated" USING (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR ("auditor_id" = "public"."current_app_user_id"())))) WITH CHECK (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR ("auditor_id" = "public"."current_app_user_id"()))));



CREATE POLICY "assigned auditors can write own answer evidences" ON "public"."answer_evidences" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM ("public"."answers" "a"
     JOIN "public"."controls" "c" ON (("c"."id" = "a"."control_id")))
  WHERE (("a"."id" = "answer_evidences"."answer_id") AND ("a"."auditor_id" = "public"."current_app_user_id"()) AND ("c"."auditor_id" = "public"."current_app_user_id"())))))));



CREATE POLICY "assigned auditors can write own answers" ON "public"."answers" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR (("auditor_id" = "public"."current_app_user_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."controls" "c"
  WHERE (("c"."id" = "answers"."control_id") AND ("c"."auditor_id" = "public"."current_app_user_id"()))))))));



CREATE POLICY "assigned auditors can write own audits" ON "public"."audits" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR (("auditor_id" = "public"."current_app_user_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."controls" "c"
  WHERE (("c"."id" = "audits"."control_id") AND ("c"."auditor_id" = "public"."current_app_user_id"()))))))));



CREATE POLICY "assigned lot team can read audits" ON "public"."audits" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_can_read_lot"("lot_id")));



CREATE POLICY "assigned lot team can read lot auditors" ON "public"."lot_auditors" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_can_read_lot"("lot_id")));



CREATE POLICY "auditors can read assigned lots" ON "public"."lots" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM "public"."lot_auditors" "la"
  WHERE (("la"."lot_id" = "lots"."id") AND ("la"."auditor_id" = "public"."current_app_user_id"())))))));



CREATE POLICY "auditors can read verticals for assigned lots" ON "public"."lot_verticals" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM "public"."lot_auditors" "la"
  WHERE (("la"."lot_id" = "lot_verticals"."lot_id") AND ("la"."auditor_id" = "public"."current_app_user_id"())))))));



ALTER TABLE "public"."audits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated can read audits" ON "public"."audits" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND true));



CREATE POLICY "authenticated can read controls" ON "public"."controls" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND true));



CREATE POLICY "authenticated can read lot auditors" ON "public"."lot_auditors" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND true));



CREATE POLICY "authenticated can read lot verticals" ON "public"."lot_verticals" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND true));



CREATE POLICY "authenticated can read lots" ON "public"."lots" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND true));



CREATE POLICY "authenticated can read notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND true));



CREATE POLICY "authenticated can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("public"."current_app_is_active"() AND (("auth_user_id" = "auth"."uid"()) AND "public"."current_app_is_active"()))) WITH CHECK (("public"."current_app_is_active"() AND (("auth_user_id" = "auth"."uid"()) AND (("role")::"text" = "public"."current_app_role"()) AND ("status" = 'activo'::"public"."record_status"))));



ALTER TABLE "public"."business_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catalog_process_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."control_models" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."controls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cycles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lot_auditors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lot_verticals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "managers and assigned auditors can insert own controls" ON "public"."controls" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_app_is_manager"() OR (("auditor_id" = "public"."current_app_user_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."lot_verticals" "lv"
  WHERE (("lv"."id" = "controls"."lot_vertical_id") AND "public"."current_app_can_read_lot"("lv"."lot_id")))))));



CREATE POLICY "managers and assigned lot auditors can read answer evidences" ON "public"."answer_evidences" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM ((("public"."answers" "a"
     JOIN "public"."controls" "c" ON (("c"."id" = "a"."control_id")))
     JOIN "public"."lot_verticals" "lv" ON (("lv"."id" = "c"."lot_vertical_id")))
     JOIN "public"."lot_auditors" "la" ON (("la"."lot_id" = "lv"."lot_id")))
  WHERE (("a"."id" = "answer_evidences"."answer_id") AND ("la"."auditor_id" = "public"."current_app_user_id"())))))));



CREATE POLICY "managers and assigned lot auditors can read answers" ON "public"."answers" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM (("public"."controls" "c"
     JOIN "public"."lot_verticals" "lv" ON (("lv"."id" = "c"."lot_vertical_id")))
     JOIN "public"."lot_auditors" "la" ON (("la"."lot_id" = "lv"."lot_id")))
  WHERE (("c"."id" = "answers"."control_id") AND ("la"."auditor_id" = "public"."current_app_user_id"())))))));



CREATE POLICY "managers and control owners can update controls" ON "public"."controls" FOR UPDATE TO "authenticated" USING (("public"."current_app_is_manager"() OR (("auditor_id" = "public"."current_app_user_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."lot_verticals" "lv"
  WHERE (("lv"."id" = "controls"."lot_vertical_id") AND "public"."current_app_can_read_lot"("lv"."lot_id"))))))) WITH CHECK (("public"."current_app_is_manager"() OR (("auditor_id" = "public"."current_app_user_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."lot_verticals" "lv"
  WHERE (("lv"."id" = "controls"."lot_vertical_id") AND "public"."current_app_can_read_lot"("lv"."lot_id")))))));



CREATE POLICY "managers and owners can read notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR ("user_id" = "public"."current_app_user_id"()))));



CREATE POLICY "managers and owners can update notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR ("user_id" = "public"."current_app_user_id"())))) WITH CHECK (("public"."current_app_is_active"() AND ("public"."current_app_is_manager"() OR ("user_id" = "public"."current_app_user_id"()))));



CREATE POLICY "managers can delete controls" ON "public"."controls" FOR DELETE TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_manager"()));



CREATE POLICY "managers can manage business units" ON "public"."business_units" TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_manager"())) WITH CHECK (("public"."current_app_is_active"() AND "public"."current_app_is_manager"()));



CREATE POLICY "managers can manage catalog items" ON "public"."catalog_items" TO "authenticated" USING ("public"."current_app_is_manager"()) WITH CHECK ("public"."current_app_is_manager"());



CREATE POLICY "managers can manage catalog process products" ON "public"."catalog_process_products" TO "authenticated" USING ("public"."current_app_is_manager"()) WITH CHECK ("public"."current_app_is_manager"());



CREATE POLICY "managers can manage cycles" ON "public"."cycles" TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_manager"())) WITH CHECK (("public"."current_app_is_active"() AND "public"."current_app_is_manager"()));



CREATE POLICY "managers can manage lot auditors" ON "public"."lot_auditors" TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_manager"())) WITH CHECK (("public"."current_app_is_active"() AND "public"."current_app_is_manager"()));



CREATE POLICY "managers can manage lot verticals" ON "public"."lot_verticals" TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_manager"())) WITH CHECK (("public"."current_app_is_active"() AND "public"."current_app_is_manager"()));



CREATE POLICY "managers can manage lots" ON "public"."lots" TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_manager"())) WITH CHECK (("public"."current_app_is_active"() AND "public"."current_app_is_manager"()));



CREATE POLICY "managers can manage model units" ON "public"."model_business_units" TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_manager"())) WITH CHECK (("public"."current_app_is_active"() AND "public"."current_app_is_manager"()));



CREATE POLICY "managers can manage models" ON "public"."control_models" TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_manager"())) WITH CHECK (("public"."current_app_is_active"() AND "public"."current_app_is_manager"()));



CREATE POLICY "managers can manage parameters" ON "public"."parameters" TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_manager"())) WITH CHECK (("public"."current_app_is_active"() AND "public"."current_app_is_manager"()));



CREATE POLICY "managers can manage thresholds" ON "public"."thresholds" TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_manager"())) WITH CHECK (("public"."current_app_is_active"() AND "public"."current_app_is_manager"()));



CREATE POLICY "managers can manage verticals" ON "public"."verticals" TO "authenticated" USING (("public"."current_app_is_active"() AND "public"."current_app_is_manager"())) WITH CHECK (("public"."current_app_is_active"() AND "public"."current_app_is_manager"()));



ALTER TABLE "public"."model_business_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parameters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."thresholds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."verticals" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."users";



-- Privilegios base; RLS continúa limitando las filas visibles.
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."create_audit_lot"("payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_audit_lot"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_audit_lot"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_audit_lot"("payload" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."cycles" TO "anon";
GRANT ALL ON TABLE "public"."cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."cycles" TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_cycle"("cycle_year" integer, "cycle_start_month" integer, "cycle_end_month" integer, "cycle_start_date" "date", "cycle_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_cycle"("cycle_year" integer, "cycle_start_month" integer, "cycle_end_month" integer, "cycle_start_date" "date", "cycle_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."create_cycle"("cycle_year" integer, "cycle_start_month" integer, "cycle_end_month" integer, "cycle_start_date" "date", "cycle_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_cycle"("cycle_year" integer, "cycle_start_month" integer, "cycle_end_month" integer, "cycle_start_date" "date", "cycle_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_app_can_read_lot"("target_lot_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_can_read_lot"("target_lot_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_can_read_lot"("target_lot_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_app_is_active"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_is_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_is_active"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_app_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_app_is_manager"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_is_manager"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_is_manager"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_app_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_app_shares_lot_with_auditor"("target_auditor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_shares_lot_with_auditor"("target_auditor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_shares_lot_with_auditor"("target_auditor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_shares_lot_with_auditor"("target_auditor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_executive_dashboard"("p_cycle_id" "uuid", "p_ecosystem" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_executive_dashboard"("p_cycle_id" "uuid", "p_ecosystem" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_executive_dashboard"("p_cycle_id" "uuid", "p_ecosystem" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_catalog_name"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_catalog_name"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_catalog_name"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_catalog_item"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_catalog_item"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_catalog_item"("payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_evaluation"("p_control_id" "uuid", "p_lot_id" "uuid", "p_answers" "jsonb", "p_finalize" boolean, "p_score" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_evaluation"("p_control_id" "uuid", "p_lot_id" "uuid", "p_answers" "jsonb", "p_finalize" boolean, "p_score" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."save_evaluation"("p_control_id" "uuid", "p_lot_id" "uuid", "p_answers" "jsonb", "p_finalize" boolean, "p_score" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_evaluation"("p_control_id" "uuid", "p_lot_id" "uuid", "p_answers" "jsonb", "p_finalize" boolean, "p_score" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_catalog_item_scope"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_catalog_item_scope"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_catalog_item_scope"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_catalog_multi_product_scope"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_catalog_multi_product_scope"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_catalog_multi_product_scope"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_catalog_process_product"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_catalog_process_product"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_catalog_process_product"() TO "service_role";


















GRANT ALL ON TABLE "public"."answer_evidences" TO "anon";
GRANT ALL ON TABLE "public"."answer_evidences" TO "authenticated";
GRANT ALL ON TABLE "public"."answer_evidences" TO "service_role";



GRANT ALL ON TABLE "public"."answers" TO "anon";
GRANT ALL ON TABLE "public"."answers" TO "authenticated";
GRANT ALL ON TABLE "public"."answers" TO "service_role";



GRANT ALL ON TABLE "public"."audits" TO "anon";
GRANT ALL ON TABLE "public"."audits" TO "authenticated";
GRANT ALL ON TABLE "public"."audits" TO "service_role";



GRANT ALL ON TABLE "public"."business_units" TO "anon";
GRANT ALL ON TABLE "public"."business_units" TO "authenticated";
GRANT ALL ON TABLE "public"."business_units" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_items" TO "anon";
GRANT ALL ON TABLE "public"."catalog_items" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_items" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_process_products" TO "anon";
GRANT ALL ON TABLE "public"."catalog_process_products" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_process_products" TO "service_role";



GRANT ALL ON TABLE "public"."control_models" TO "anon";
GRANT ALL ON TABLE "public"."control_models" TO "authenticated";
GRANT ALL ON TABLE "public"."control_models" TO "service_role";



GRANT ALL ON TABLE "public"."controls" TO "anon";
GRANT ALL ON TABLE "public"."controls" TO "authenticated";
GRANT ALL ON TABLE "public"."controls" TO "service_role";



GRANT ALL ON TABLE "public"."lot_verticals" TO "anon";
GRANT ALL ON TABLE "public"."lot_verticals" TO "authenticated";
GRANT ALL ON TABLE "public"."lot_verticals" TO "service_role";



GRANT ALL ON TABLE "public"."lots" TO "anon";
GRANT ALL ON TABLE "public"."lots" TO "authenticated";
GRANT ALL ON TABLE "public"."lots" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_control_facts" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_control_facts" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_control_facts" TO "service_role";



GRANT ALL ON TABLE "public"."lot_auditors" TO "anon";
GRANT ALL ON TABLE "public"."lot_auditors" TO "authenticated";
GRANT ALL ON TABLE "public"."lot_auditors" TO "service_role";



GRANT ALL ON TABLE "public"."model_business_units" TO "anon";
GRANT ALL ON TABLE "public"."model_business_units" TO "authenticated";
GRANT ALL ON TABLE "public"."model_business_units" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."parameters" TO "anon";
GRANT ALL ON TABLE "public"."parameters" TO "authenticated";
GRANT ALL ON TABLE "public"."parameters" TO "service_role";



GRANT ALL ON TABLE "public"."thresholds" TO "anon";
GRANT ALL ON TABLE "public"."thresholds" TO "authenticated";
GRANT ALL ON TABLE "public"."thresholds" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."verticals" TO "anon";
GRANT ALL ON TABLE "public"."verticals" TO "authenticated";
GRANT ALL ON TABLE "public"."verticals" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


-- Objetos administrados fuera del esquema public. `supabase db dump` omite
-- auth y storage, por lo que su configuración propia se conserva aquí.

DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created"
AFTER INSERT ON "auth"."users"
FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_auth_user"();

INSERT INTO "storage"."buckets" (
  "id",
  "name",
  "public",
  "file_size_limit",
  "allowed_mime_types"
)
VALUES (
  'answer-evidences',
  'answer-evidences',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/rtf',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
    'text/csv',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint.slideshow.macroEnabled.12',
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    'application/vnd.oasis.opendocument.presentation',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
    'image/heic',
    'image/heif'
  ]::text[]
)
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "public" = EXCLUDED."public",
  "file_size_limit" = EXCLUDED."file_size_limit",
  "allowed_mime_types" = EXCLUDED."allowed_mime_types";

DROP POLICY IF EXISTS "authenticated can read answer evidence files" ON "storage"."objects";
DROP POLICY IF EXISTS "authenticated can upload answer evidence files" ON "storage"."objects";
DROP POLICY IF EXISTS "authenticated can update answer evidence files" ON "storage"."objects";
DROP POLICY IF EXISTS "authenticated can delete answer evidence files" ON "storage"."objects";
DROP POLICY IF EXISTS "app users can read permitted answer evidence files" ON "storage"."objects";
DROP POLICY IF EXISTS "assigned lot team can read answer evidence files" ON "storage"."objects";
DROP POLICY IF EXISTS "auditors can upload answer evidence files" ON "storage"."objects";
DROP POLICY IF EXISTS "managers can delete answer evidence files" ON "storage"."objects";

CREATE POLICY "authorized users can read answer evidence files"
ON "storage"."objects"
FOR SELECT
TO "authenticated"
USING (
  "public"."current_app_is_active"()
  AND "bucket_id" = 'answer-evidences'
  AND EXISTS (
    SELECT 1
    FROM "public"."answer_evidences" AS "ae"
    JOIN "public"."answers" AS "a" ON "a"."id" = "ae"."answer_id"
    JOIN "public"."controls" AS "c" ON "c"."id" = "a"."control_id"
    JOIN "public"."lot_verticals" AS "lv" ON "lv"."id" = "c"."lot_vertical_id"
    WHERE "ae"."file_url" = "storage"."objects"."name"
      AND (
        "public"."current_app_is_manager"()
        OR "a"."auditor_id" = "public"."current_app_user_id"()
        OR "c"."auditor_id" = "public"."current_app_user_id"()
        OR "public"."current_app_can_read_lot"("lv"."lot_id")
      )
  )
);

CREATE POLICY "auditors can upload answer evidence files"
ON "storage"."objects"
FOR INSERT
TO "authenticated"
WITH CHECK (
  "public"."current_app_is_active"()
  AND "bucket_id" = 'answer-evidences'
  AND EXISTS (
    SELECT 1
    FROM "public"."answers" AS "a"
    JOIN "public"."controls" AS "c" ON "c"."id" = "a"."control_id"
    WHERE "a"."id"::text = ("storage"."foldername"("storage"."objects"."name"))[2]
      AND "a"."control_id"::text = ("storage"."foldername"("storage"."objects"."name"))[1]
      AND "a"."auditor_id" = "public"."current_app_user_id"()
      AND "c"."auditor_id" = "public"."current_app_user_id"()
  )
);

CREATE POLICY "managers can delete answer evidence files"
ON "storage"."objects"
FOR DELETE
TO "authenticated"
USING (
  "public"."current_app_is_active"()
  AND "bucket_id" = 'answer-evidences'
  AND "public"."current_app_is_manager"()
);

NOTIFY "pgrst", 'reload schema';





















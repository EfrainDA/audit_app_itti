


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



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
    'en_replica',
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
    'replica',
    'cierre',
    'ajuste',
    'asignacion'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."question_response_type" AS ENUM (
    'cumple_no_cumple',
    'cumple_intermedio_no_cumple'
);


ALTER TYPE "public"."question_response_type" OWNER TO "postgres";


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
    'supervisor',
    'auditor',
    'auditado'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."current_app_is_manager"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(public.current_app_role() in ('admin', 'supervisor'), false);
$$;


ALTER FUNCTION "public"."current_app_is_manager"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select role::text from public.users where auth_user_id = auth.uid() limit 1;
$$;


ALTER FUNCTION "public"."current_app_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select id from public.users where auth_user_id = auth.uid() limit 1;
$$;


ALTER FUNCTION "public"."current_app_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.users (auth_user_id, name, email, company, cargo, area, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Usuario'),
    new.email,
    coalesce(new.raw_user_meta_data->>'company', new.raw_user_meta_data->>'empresa'),
    new.raw_user_meta_data->>'cargo',
    new.raw_user_meta_data->>'area',
    'auditor',
    'activo'
  )
  on conflict (email) do update
    set auth_user_id = coalesce(public.users.auth_user_id, excluded.auth_user_id),
        name = coalesce(public.users.name, excluded.name),
        company = coalesce(public.users.company, excluded.company),
        cargo = coalesce(public.users.cargo, excluded.cargo),
        area = coalesce(public.users.area, excluded.area),
        updated_at = now();

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


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
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."answers" OWNER TO "postgres";


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
    "code" "text" NOT NULL,
    "zone" "text",
    "owner_name" "text",
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."business_units" OWNER TO "postgres";


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
    CONSTRAINT "controls_control_score_check" CHECK ((("control_score" IS NULL) OR (("control_score" >= (0)::numeric) AND ("control_score" <= (100)::numeric))))
);


ALTER TABLE "public"."controls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "bimester" integer NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'habilitado'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cycles_bimester_check" CHECK ((("bimester" >= 1) AND ("bimester" <= 6))),
    CONSTRAINT "cycles_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "cycles_status_check" CHECK (("status" = ANY (ARRAY['habilitado'::"text", 'deshabilitado'::"text"])))
);


ALTER TABLE "public"."cycles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lot_auditors" (
    "lot_id" "uuid" NOT NULL,
    "auditor_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lot_auditors" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parameter_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "response_type" "public"."question_response_type" DEFAULT 'cumple_no_cumple'::"public"."question_response_type" NOT NULL,
    "evidence_required" boolean DEFAULT false NOT NULL,
    "comment_required" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


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
    ADD CONSTRAINT "business_units_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."business_units"
    ADD CONSTRAINT "business_units_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_answers_control_id" ON "public"."answers" USING "btree" ("control_id");



CREATE INDEX "idx_audits_auditor_id" ON "public"."audits" USING "btree" ("auditor_id");



CREATE INDEX "idx_audits_lot_id" ON "public"."audits" USING "btree" ("lot_id");



CREATE INDEX "idx_business_units_ecosystem" ON "public"."business_units" USING "btree" ("ecosystem");



CREATE INDEX "idx_controls_auditor_id" ON "public"."controls" USING "btree" ("auditor_id");



CREATE INDEX "idx_controls_lot_vertical_id" ON "public"."controls" USING "btree" ("lot_vertical_id");



CREATE INDEX "idx_controls_status" ON "public"."controls" USING "btree" ("status");



CREATE INDEX "idx_lot_auditors_auditor_id" ON "public"."lot_auditors" USING "btree" ("auditor_id");



CREATE INDEX "idx_lot_verticals_lot_id" ON "public"."lot_verticals" USING "btree" ("lot_id");



CREATE INDEX "idx_lots_business_unit_id" ON "public"."lots" USING "btree" ("business_unit_id");



CREATE INDEX "idx_lots_cycle_id" ON "public"."lots" USING "btree" ("cycle_id");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_parameters_vertical_id" ON "public"."parameters" USING "btree" ("vertical_id");



CREATE INDEX "idx_questions_parameter_id" ON "public"."questions" USING "btree" ("parameter_id");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_verticals_model_id" ON "public"."verticals" USING "btree" ("model_id");



CREATE OR REPLACE TRIGGER "set_answers_updated_at" BEFORE UPDATE ON "public"."answers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_audits_updated_at" BEFORE UPDATE ON "public"."audits" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_business_units_updated_at" BEFORE UPDATE ON "public"."business_units" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_control_models_updated_at" BEFORE UPDATE ON "public"."control_models" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_controls_updated_at" BEFORE UPDATE ON "public"."controls" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_lots_updated_at" BEFORE UPDATE ON "public"."lots" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



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



ALTER TABLE ONLY "public"."control_models"
    ADD CONSTRAINT "control_models_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."controls"
    ADD CONSTRAINT "controls_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "public"."parameters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."verticals"
    ADD CONSTRAINT "verticals_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."control_models"("id") ON DELETE CASCADE;



ALTER TABLE "public"."answer_evidences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assigned auditors can read controls" ON "public"."controls" FOR SELECT TO "authenticated" USING (("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM ("public"."lot_verticals" "lv"
     JOIN "public"."lot_auditors" "la" ON (("la"."lot_id" = "lv"."lot_id")))
  WHERE (("lv"."id" = "controls"."lot_vertical_id") AND ("la"."auditor_id" = "public"."current_app_user_id"()))))));



CREATE POLICY "assigned auditors can update own answers" ON "public"."answers" FOR UPDATE TO "authenticated" USING (("public"."current_app_is_manager"() OR ("auditor_id" = "public"."current_app_user_id"()))) WITH CHECK (("public"."current_app_is_manager"() OR (("auditor_id" = "public"."current_app_user_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."controls" "c"
  WHERE (("c"."id" = "answers"."control_id") AND ("c"."auditor_id" = "public"."current_app_user_id"())))))));



CREATE POLICY "assigned auditors can update own audits" ON "public"."audits" FOR UPDATE TO "authenticated" USING (("public"."current_app_is_manager"() OR ("auditor_id" = "public"."current_app_user_id"()))) WITH CHECK (("public"."current_app_is_manager"() OR ("auditor_id" = "public"."current_app_user_id"())));



CREATE POLICY "assigned auditors can write own answer evidences" ON "public"."answer_evidences" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM ("public"."answers" "a"
     JOIN "public"."controls" "c" ON (("c"."id" = "a"."control_id")))
  WHERE (("a"."id" = "answer_evidences"."answer_id") AND ("a"."auditor_id" = "public"."current_app_user_id"()) AND ("c"."auditor_id" = "public"."current_app_user_id"()))))));



CREATE POLICY "assigned auditors can write own answers" ON "public"."answers" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_app_is_manager"() OR (("auditor_id" = "public"."current_app_user_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."controls" "c"
  WHERE (("c"."id" = "answers"."control_id") AND ("c"."auditor_id" = "public"."current_app_user_id"())))))));



CREATE POLICY "assigned auditors can write own audits" ON "public"."audits" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_app_is_manager"() OR (("auditor_id" = "public"."current_app_user_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."controls" "c"
  WHERE (("c"."id" = "audits"."control_id") AND ("c"."auditor_id" = "public"."current_app_user_id"())))))));



CREATE POLICY "assigned lot team can read lot auditors" ON "public"."lot_auditors" FOR SELECT TO "authenticated" USING ("public"."current_app_can_read_lot"("lot_id"));



CREATE POLICY "auditors can read assigned lots" ON "public"."lots" FOR SELECT TO "authenticated" USING (("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM "public"."lot_auditors" "la"
  WHERE (("la"."lot_id" = "lots"."id") AND ("la"."auditor_id" = "public"."current_app_user_id"()))))));



CREATE POLICY "auditors can read verticals for assigned lots" ON "public"."lot_verticals" FOR SELECT TO "authenticated" USING (("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM "public"."lot_auditors" "la"
  WHERE (("la"."lot_id" = "lot_verticals"."lot_id") AND ("la"."auditor_id" = "public"."current_app_user_id"()))))));



ALTER TABLE "public"."audits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated app users can insert notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_app_user_id"() IS NOT NULL));



CREATE POLICY "authenticated can insert own profile" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "authenticated can manage business units" ON "public"."business_units" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can manage cycles" ON "public"."cycles" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can manage model units" ON "public"."model_business_units" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can manage models" ON "public"."control_models" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can manage parameters" ON "public"."parameters" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can manage questions" ON "public"."questions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can manage thresholds" ON "public"."thresholds" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can manage users" ON "public"."users" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can manage verticals" ON "public"."verticals" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can read configuration" ON "public"."business_units" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read cycles" ON "public"."cycles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read model units" ON "public"."model_business_units" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read models" ON "public"."control_models" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read parameters" ON "public"."parameters" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read questions" ON "public"."questions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read thresholds" ON "public"."thresholds" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read users" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read verticals" ON "public"."verticals" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth_user_id" = "auth"."uid"())) WITH CHECK (("auth_user_id" = "auth"."uid"()));



ALTER TABLE "public"."business_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."control_models" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."controls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cycles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lot_auditors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lot_verticals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "managers and assigned auditors can read audits" ON "public"."audits" FOR SELECT TO "authenticated" USING (("public"."current_app_is_manager"() OR ("auditor_id" = "public"."current_app_user_id"())));



CREATE POLICY "managers and assigned lot auditors can insert controls" ON "public"."controls" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM ("public"."lot_verticals" "lv"
     JOIN "public"."lot_auditors" "la" ON (("la"."lot_id" = "lv"."lot_id")))
  WHERE (("lv"."id" = "controls"."lot_vertical_id") AND ("la"."auditor_id" = "public"."current_app_user_id"()))))));



CREATE POLICY "managers and assigned lot auditors can read answer evidences" ON "public"."answer_evidences" FOR SELECT TO "authenticated" USING (("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM ((("public"."answers" "a"
     JOIN "public"."controls" "c" ON (("c"."id" = "a"."control_id")))
     JOIN "public"."lot_verticals" "lv" ON (("lv"."id" = "c"."lot_vertical_id")))
     JOIN "public"."lot_auditors" "la" ON (("la"."lot_id" = "lv"."lot_id")))
  WHERE (("a"."id" = "answer_evidences"."answer_id") AND ("la"."auditor_id" = "public"."current_app_user_id"()))))));



CREATE POLICY "managers and assigned lot auditors can read answers" ON "public"."answers" FOR SELECT TO "authenticated" USING (("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM (("public"."controls" "c"
     JOIN "public"."lot_verticals" "lv" ON (("lv"."id" = "c"."lot_vertical_id")))
     JOIN "public"."lot_auditors" "la" ON (("la"."lot_id" = "lv"."lot_id")))
  WHERE (("c"."id" = "answers"."control_id") AND ("la"."auditor_id" = "public"."current_app_user_id"()))))));



CREATE POLICY "managers and assigned lot auditors can update controls" ON "public"."controls" FOR UPDATE TO "authenticated" USING (("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM ("public"."lot_verticals" "lv"
     JOIN "public"."lot_auditors" "la" ON (("la"."lot_id" = "lv"."lot_id")))
  WHERE (("lv"."id" = "controls"."lot_vertical_id") AND ("la"."auditor_id" = "public"."current_app_user_id"())))))) WITH CHECK (("public"."current_app_is_manager"() OR (EXISTS ( SELECT 1
   FROM ("public"."lot_verticals" "lv"
     JOIN "public"."lot_auditors" "la" ON (("la"."lot_id" = "lv"."lot_id")))
  WHERE (("lv"."id" = "controls"."lot_vertical_id") AND ("la"."auditor_id" = "public"."current_app_user_id"()))))));



CREATE POLICY "managers and owners can read notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("public"."current_app_is_manager"() OR ("user_id" = "public"."current_app_user_id"())));



CREATE POLICY "managers and owners can update notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("public"."current_app_is_manager"() OR ("user_id" = "public"."current_app_user_id"()))) WITH CHECK (("public"."current_app_is_manager"() OR ("user_id" = "public"."current_app_user_id"())));



CREATE POLICY "managers can delete controls" ON "public"."controls" FOR DELETE TO "authenticated" USING ("public"."current_app_is_manager"());



CREATE POLICY "managers can manage lot auditors" ON "public"."lot_auditors" TO "authenticated" USING ("public"."current_app_is_manager"()) WITH CHECK ("public"."current_app_is_manager"());



CREATE POLICY "managers can manage lot verticals" ON "public"."lot_verticals" TO "authenticated" USING ("public"."current_app_is_manager"()) WITH CHECK ("public"."current_app_is_manager"());



CREATE POLICY "managers can manage lots" ON "public"."lots" TO "authenticated" USING ("public"."current_app_is_manager"()) WITH CHECK ("public"."current_app_is_manager"());



ALTER TABLE "public"."model_business_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parameters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."thresholds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."verticals" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."current_app_can_read_lot"("target_lot_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_can_read_lot"("target_lot_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_can_read_lot"("target_lot_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_app_is_manager"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_is_manager"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_is_manager"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_app_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



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



GRANT ALL ON TABLE "public"."control_models" TO "anon";
GRANT ALL ON TABLE "public"."control_models" TO "authenticated";
GRANT ALL ON TABLE "public"."control_models" TO "service_role";



GRANT ALL ON TABLE "public"."controls" TO "anon";
GRANT ALL ON TABLE "public"."controls" TO "authenticated";
GRANT ALL ON TABLE "public"."controls" TO "service_role";



GRANT ALL ON TABLE "public"."cycles" TO "anon";
GRANT ALL ON TABLE "public"."cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."cycles" TO "service_role";



GRANT ALL ON TABLE "public"."lot_auditors" TO "anon";
GRANT ALL ON TABLE "public"."lot_auditors" TO "authenticated";
GRANT ALL ON TABLE "public"."lot_auditors" TO "service_role";



GRANT ALL ON TABLE "public"."lot_verticals" TO "anon";
GRANT ALL ON TABLE "public"."lot_verticals" TO "authenticated";
GRANT ALL ON TABLE "public"."lot_verticals" TO "service_role";



GRANT ALL ON TABLE "public"."lots" TO "anon";
GRANT ALL ON TABLE "public"."lots" TO "authenticated";
GRANT ALL ON TABLE "public"."lots" TO "service_role";



GRANT ALL ON TABLE "public"."model_business_units" TO "anon";
GRANT ALL ON TABLE "public"."model_business_units" TO "authenticated";
GRANT ALL ON TABLE "public"."model_business_units" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."parameters" TO "anon";
GRANT ALL ON TABLE "public"."parameters" TO "authenticated";
GRANT ALL ON TABLE "public"."parameters" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



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








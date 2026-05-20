"use client"

import { supabase } from "@/lib/supabase"
import type {
  Auditoria,
  Ciclo,
  Control,
  Lote,
  LoteVertical,
  ModeloControl,
  Notificacion,
  Parametro,
  Pregunta,
  Umbral,
  UnidadNegocio,
  User,
  Vertical,
} from "@/lib/data"

export type AppData = {
  users: User[]
  unidades: UnidadNegocio[]
  ciclos: Ciclo[]
  umbrales: Umbral[]
  modelos: ModeloControl[]
  lotes: Lote[]
  loteVerticales: LoteVertical[]
  auditorias: Auditoria[]
  notificaciones: Notificacion[]
}

type DbUser = {
  id: string
  name: string
  email: string
  role: User["role"]
  status: User["status"]
  avatar: string | null
}

type DbBusinessUnit = {
  id: string
  name: string
  ecosystem: string
  code: string
  zone: string | null
  owner_name: string | null
  logo_url: string | null
}

type DbCycle = {
  id: string
  year: number
  bimester: number
  start_date: string
  end_date: string
}

type DbThreshold = {
  id: string
  name: string
  min_value: number
  max_value: number
  color: Umbral["color"]
}

type DbQuestion = {
  id: string
  text: string
  response_type: Pregunta["tipoRespuesta"]
  evidence_required: boolean
  comment_required: boolean
  sort_order: number
}

type DbParameter = {
  id: string
  name: string
  description: string | null
  base_points: number
  allows_intermediate: boolean
  sort_order: number
  questions: DbQuestion[]
}

type DbVertical = {
  id: string
  name: string
  description: string | null
  weight: number
  evaluation_mode: Vertical["tipoEvaluacion"]
  contains_process: boolean
  sort_order: number
  parameters: DbParameter[]
}

type DbModel = {
  id: string
  name: string
  description: string | null
  status: ModeloControl["estado"]
  valid_from: string | null
  valid_until: string | null
  created_by: string
  created_at: string
  verticals: DbVertical[]
  model_business_units: { business_unit_id: string }[]
}

type DbLot = {
  id: string
  business_unit_id: string
  model_id: string
  cycle_id: string
  status: Lote["estado"]
  cycles: Pick<DbCycle, "year" | "bimester"> | null
  lot_auditors: { auditor_id: string }[]
}

type DbControl = {
  id: string
  lot_vertical_id: string
  identifier: string
  description: string | null
  status: Control["estado"] | "en_replica" | "terminada"
  control_score: number | null
  process: string | null
  subprocess: string | null
  subprocesses: string[] | null
  corresponds_to_process: boolean
  product: string | null
  auditor_id: string | null
  created_at: string
}

type DbLotVertical = {
  id: string
  lot_id: string
  vertical_id: string
  controls: DbControl[]
}

type DbAudit = {
  id: string
  lot_id: string
  control_id: string
  audit_date: string
  status: Auditoria["estado"] | "terminado"
  total_score: number | null
  auditor_id: string
}

type DbNotification = {
  id: string
  user_id: string
  title: string
  message: string
  type: Notificacion["tipo"]
  read: boolean
  created_at: string
}

function mapQuestion(question: DbQuestion): Pregunta {
  return {
    id: question.id,
    texto: question.text,
    tipoRespuesta: question.response_type,
    evidenciaObligatoria: question.evidence_required,
    comentarioObligatorio: question.comment_required,
  }
}

function mapParameter(parameter: DbParameter): Parametro {
  return {
    id: parameter.id,
    nombre: parameter.name,
    descripcion: parameter.description ?? undefined,
    puntosBase: Number(parameter.base_points),
    permiteIntermedio: parameter.allows_intermediate,
    preguntas: [...(parameter.questions ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(mapQuestion),
  }
}

function mapVertical(vertical: DbVertical): Vertical {
  return {
    id: vertical.id,
    nombre: vertical.name,
    descripcion: vertical.description ?? undefined,
    peso: Number(vertical.weight),
    tipoEvaluacion: vertical.evaluation_mode,
    contieneProceso: vertical.contains_process,
    parametros: [...(vertical.parameters ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(mapParameter),
  }
}

function normalizeControlStatus(status: DbControl["status"]): Control["estado"] {
  if (status === "terminada") return "terminado"
  if (status === "en_replica") return "en_curso"
  return status
}

function normalizeAuditStatus(status: DbAudit["status"]): Auditoria["estado"] {
  if (status === "terminado") return "terminada"
  return status
}

export async function fetchAppData(): Promise<AppData> {
  const [
    usersResult,
    unitsResult,
    cyclesResult,
    thresholdsResult,
    modelsResult,
    lotsResult,
    lotVerticalsResult,
    auditsResult,
    notificationsResult,
  ] = await Promise.all([
    supabase.from("users").select("id,name,email,role,status,avatar").order("name"),
    supabase.from("business_units").select("id,name,ecosystem,code,zone,owner_name,logo_url").order("name"),
    supabase.from("cycles").select("id,year,bimester,start_date,end_date").order("year").order("bimester"),
    supabase.from("thresholds").select("id,name,min_value,max_value,color").order("min_value"),
    supabase
      .from("control_models")
      .select(`
        id,name,description,status,valid_from,valid_until,created_by,created_at,
        model_business_units(business_unit_id),
        verticals(
          id,name,description,weight,evaluation_mode,contains_process,sort_order,
          parameters(
            id,name,description,base_points,allows_intermediate,sort_order,
            questions(id,text,response_type,evidence_required,comment_required,sort_order)
          )
        )
      `)
      .order("created_at", { ascending: false }),
    supabase
      .from("lots")
      .select("id,business_unit_id,model_id,cycle_id,status,cycles(year,bimester),lot_auditors(auditor_id)")
      .order("created_at", { ascending: false }),
    supabase
      .from("lot_verticals")
      .select(`
        id,lot_id,vertical_id,
        controls(
          id,lot_vertical_id,identifier,description,status,control_score,process,subprocess,
          subprocesses,corresponds_to_process,product,auditor_id,created_at
        )
      `),
    supabase.from("audits").select("id,lot_id,control_id,audit_date,status,total_score,auditor_id").order("audit_date", { ascending: false }),
    supabase.from("notifications").select("id,user_id,title,message,type,read,created_at").order("created_at", { ascending: false }),
  ])

  const firstError = [
    usersResult.error,
    unitsResult.error,
    cyclesResult.error,
    thresholdsResult.error,
    modelsResult.error,
    lotsResult.error,
    lotVerticalsResult.error,
    auditsResult.error,
    notificationsResult.error,
  ].find(Boolean)

  if (firstError) {
    throw firstError
  }

  return {
    users: ((usersResult.data ?? []) as DbUser[]).map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar ?? undefined,
    })),
    unidades: ((unitsResult.data ?? []) as DbBusinessUnit[]).map((unit) => ({
      id: unit.id,
      nombre: unit.name,
      ecosistema: unit.ecosystem,
      codigo: unit.code,
      zona: unit.zone ?? "",
      responsable: unit.owner_name ?? "",
      logo: unit.logo_url ?? undefined,
    })),
    ciclos: ((cyclesResult.data ?? []) as DbCycle[]).map((cycle) => ({
      id: cycle.id,
      año: cycle.year,
      bimestre: cycle.bimester,
      fechaInicio: cycle.start_date,
      fechaFin: cycle.end_date,
    })),
    umbrales: ((thresholdsResult.data ?? []) as DbThreshold[]).map((threshold) => ({
      id: threshold.id,
      nombre: threshold.name,
      min: Number(threshold.min_value),
      max: Number(threshold.max_value),
      color: threshold.color,
    })),
    modelos: ((modelsResult.data ?? []) as unknown as DbModel[]).map((model) => ({
      id: model.id,
      nombre: model.name,
      descripcion: model.description ?? undefined,
      estado: model.status,
      fechaVigenciaDesde: model.valid_from ?? undefined,
      fechaVigenciaHasta: model.valid_until ?? undefined,
      verticales: [...(model.verticals ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(mapVertical),
      creadoPor: model.created_by,
      fechaCreacion: model.created_at,
      unidadesAplicables: (model.model_business_units ?? []).map((unit) => unit.business_unit_id),
    })),
    lotes: ((lotsResult.data ?? []) as unknown as DbLot[]).map((lot) => ({
      id: lot.id,
      unidadNegocioId: lot.business_unit_id,
      modeloControlId: lot.model_id,
      año: lot.cycles?.year ?? new Date().getFullYear(),
      ciclo: lot.cycles?.bimester ?? 1,
      estado: lot.status,
      auditores: (lot.lot_auditors ?? []).map((auditor) => auditor.auditor_id),
    })),
    loteVerticales: ((lotVerticalsResult.data ?? []) as unknown as DbLotVertical[]).map((lotVertical) => ({
      id: lotVertical.id,
      loteId: lotVertical.lot_id,
      verticalId: lotVertical.vertical_id,
      controles: (lotVertical.controls ?? []).map((control) => ({
        id: control.id,
        loteVerticalId: control.lot_vertical_id,
        identificador: control.identifier,
        descripcion: control.description ?? undefined,
        estado: normalizeControlStatus(control.status),
        scoreControl: control.control_score ?? undefined,
        proceso: control.process ?? undefined,
        subproceso: control.subprocess ?? undefined,
        subprocesos: control.subprocesses ?? undefined,
        correspondeProceso: control.corresponds_to_process,
        producto: control.product ?? undefined,
        fechaCreacion: control.created_at,
        auditorId: control.auditor_id ?? undefined,
      })),
    })),
    auditorias: ((auditsResult.data ?? []) as DbAudit[]).map((audit) => ({
      id: audit.id,
      loteId: audit.lot_id,
      controlId: audit.control_id,
      fecha: audit.audit_date,
      estado: normalizeAuditStatus(audit.status),
      scoreTotal: audit.total_score ?? undefined,
      auditorId: audit.auditor_id,
    })),
    notificaciones: ((notificationsResult.data ?? []) as DbNotification[]).map((notification) => ({
      id: notification.id,
      usuarioId: notification.user_id,
      titulo: notification.title,
      mensaje: notification.message,
      tipo: notification.type,
      leida: notification.read,
      fecha: notification.created_at,
    })),
  }
}

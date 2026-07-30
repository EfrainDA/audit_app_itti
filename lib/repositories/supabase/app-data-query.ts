"use client"

import type {
  Auditoria,
  CatalogItem,
  Ciclo,
  Control,
  Lote,
  LoteVertical,
  ModeloControl,
  Notificacion,
  Parametro,
  Respuesta,
  Umbral,
  UnidadNegocio,
  User,
  Vertical,
} from "@/lib/data"
import { requireActiveProfile } from "@/lib/repositories/supabase/access"
import { supabase } from "@/lib/supabase"
import type { DbCatalogItem, DbControl, DbLotVertical } from "./app-data-db-types"

// Capa de acceso a datos: centraliza consultas a Supabase, adaptación de filas
// al modelo de la UI y validaciones de permisos previas a cada escritura.

export type AppData = {
  users: User[]
  unidades: UnidadNegocio[]
  ciclos: Ciclo[]
  umbrales: Umbral[]
  catalogItems: CatalogItem[]
  modelos: ModeloControl[]
  lotes: Lote[]
  loteVerticales: LoteVertical[]
  auditorias: Auditoria[]
  respuestas: Respuesta[]
  answeredControlIds: string[]
  notificaciones: Notificacion[]
}
export type AppDataDomain =
  | "users"
  | "settings"
  | "models"
  | "planning"
  | "evaluations"
  | "dashboard"
  | "notifications"

export type AppDataScope = {
  lotId?: string
  controlId?: string
}

const ALL_APP_DATA_DOMAINS: AppDataDomain[] = [
  "users",
  "settings",
  "models",
  "planning",
  "evaluations",
  "notifications",
]

// Formas internas de las filas SQL; se separan de los modelos de dominio porque
// los nombres y valores de persistencia no siempre coinciden con los de la UI.
type DbUser = {
  id: string
  name: string
  email: string
  company: string | null
  cargo: string | null
  area: string | null
  role: User["role"]
  status: User["status"]
  avatar: string | null
}

type DbBusinessUnit = {
  id: string
  name: string
  ecosystem: string
  logo_url: string | null
}

type DbCycle = {
  id: string
  year: number
  bimester: number
  start_month?: number | null
  end_month?: number | null
  start_date: string
  end_date: string
  status?: Ciclo["estado"] | null
}

type DbThreshold = {
  id: string
  name: string
  min_value: number
  max_value: number
  color: string
}

type DbParameter = {
  id: string
  name: string
  description: string | null
  base_points: number
  allows_intermediate: boolean
  sort_order: number
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
  users: Pick<DbUser, "name"> | null
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

type DbAudit = {
  id: string
  lot_id: string
  control_id: string
  audit_date: string
  status: Auditoria["estado"] | "terminado"
  total_score: number | null
  auditor_id: string
}

type DbAnswer = {
  id: string
  control_id: string
  parameter_id: string
  value: Respuesta["valor"]
  comment: string | null
  audited_people: string[] | null
  audited_roles: string[] | null
  audited_areas: string[] | null
  answered_at: string
  auditor_id: string
  answer_evidences?: { file_name: string | null; file_url: string }[]
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

// Compatibilidad temporal con instalaciones que aún no aplicaron migraciones recientes.
function isMissingAuditedAreasColumn(error: unknown) {
  if (!error || typeof error !== "object") return false
  const record = error as Record<string, unknown>
  return record.code === "42703" || (typeof record.message === "string" && record.message.includes("audited_areas"))
}

function isMissingCycleStatusColumn(error: unknown) {
  if (!error || typeof error !== "object") return false
  const record = error as Record<string, unknown>
  return record.code === "42703" || (typeof record.message === "string" && record.message.includes("status"))
}

// Adaptadores de registros de base de datos al vocabulario de la aplicación.
function mapParameter(parameter: DbParameter): Parametro {
  return {
    id: parameter.id,
    nombre: parameter.name,
    descripcion: parameter.description ?? undefined,
    puntosBase: Number(parameter.base_points),
    permiteIntermedio: parameter.allows_intermediate,
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
  return status
}

function normalizeLookupValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function normalizeThresholdColor(color: string, name: string): Umbral["color"] {
  const normalizedColor = color.trim().toLowerCase()
  const normalizedName = normalizeLookupValue(name)

  if (normalizedColor === "verde" || normalizedColor === "#16a34a" || normalizedName.includes("optimo")) return "verde"
  if (normalizedColor === "amarillo" || normalizedColor === "#d97706" || normalizedName.includes("aceptable")) return "amarillo"
  return "rojo"
}

function normalizeAuditStatus(status: DbAudit["status"]): Auditoria["estado"] {
  if (status === "terminado") return "terminada"
  return status
}

async function fetchCyclesData(signal: AbortSignal): Promise<{ data: DbCycle[] | null; error: unknown }> {
  const result = await supabase.from("cycles").select("id,year,bimester,start_month,end_month,start_date,end_date,status").order("year").order("start_month").abortSignal(signal)

  if (result.error && ["start_month", "end_month"].some((column) => JSON.stringify(result.error).includes(column))) {
    const legacyResult = await supabase.from("cycles").select("id,year,bimester,start_date,end_date,status").order("year").order("bimester").abortSignal(signal)
    if (!isMissingCycleStatusColumn(legacyResult.error)) {
      return { data: legacyResult.data as DbCycle[] | null, error: legacyResult.error }
    }

    const fallbackResult = await supabase.from("cycles").select("id,year,bimester,start_date,end_date").order("year").order("bimester").abortSignal(signal)
    return { data: fallbackResult.data as DbCycle[] | null, error: fallbackResult.error }
  }

  if (isMissingCycleStatusColumn(result.error)) {
    const fallbackResult = await supabase.from("cycles").select("id,year,bimester,start_month,end_month,start_date,end_date").order("year").order("start_month").abortSignal(signal)
    return { data: fallbackResult.data as DbCycle[] | null, error: fallbackResult.error }
  }

  return { data: result.data as DbCycle[] | null, error: result.error }
}

const SUPABASE_PAGE_SIZE = 500

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ data: T[] | null; error: unknown }> {
  const rows: T[] = []

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const result = await fetchPage(from, from + SUPABASE_PAGE_SIZE - 1)
    if (result.error) return { data: null, error: result.error }
    const page = result.data ?? []
    rows.push(...page)
    if (page.length < SUPABASE_PAGE_SIZE) return { data: rows, error: null }
  }
}

// Carga el conjunto de datos visible para el perfil y arma sus relaciones.
export async function fetchAppData(
  profile: Pick<User, "id" | "role" | "status"> | undefined,
  signal: AbortSignal,
  domains: AppDataDomain[] = ALL_APP_DATA_DOMAINS,
  scope: AppDataScope = {},
): Promise<AppData> {
  const currentProfile = profile ?? await requireActiveProfile()
  const requestedDomains = new Set(domains)
  const needs = (...values: AppDataDomain[]) => values.some((value) => requestedDomains.has(value))
  const emptyResult = () => Promise.resolve({ data: null, error: null })

  // Ejecuta en paralelo solo las consultas requeridas por la pantalla actual.
  const [
    usersResult,
    unitsResult,
    cyclesResult,
    thresholdsResult,
    catalogItemsResult,
    modelsResult,
    lotsResult,
    lotVerticalsResult,
    auditsResult,
    answersResult,
    notificationsResult,
  ] = await Promise.all([
    needs("users", "planning", "evaluations", "dashboard") ? fetchAllPages((from, to) =>
      supabase.from("users").select("id,name,email,company,cargo,area,role,status,avatar").order("name").range(from, to).abortSignal(signal)
    ) : emptyResult(),
    needs("settings", "planning", "evaluations", "dashboard") ? supabase.from("business_units").select("id,name,ecosystem,logo_url").order("name").abortSignal(signal) : emptyResult(),
    needs("settings", "planning", "evaluations", "dashboard") ? fetchCyclesData(signal) : emptyResult(),
    needs("settings") ? supabase.from("thresholds").select("id,name,min_value,max_value,color").order("min_value").abortSignal(signal) : emptyResult(),
    needs("settings", "planning") ? fetchAllPages((from, to) => supabase
      .from("catalog_items")
      .select("id,category,name,description,subprocesses,business_unit_id,linked_product_id,status,created_at,catalog_process_products!catalog_process_products_process_id_fkey(product_id)")
      .order("category")
      .order("name")
      .range(from, to)
      .abortSignal(signal)) : emptyResult(),
    needs("models", "planning", "evaluations", "dashboard") ? fetchAllPages((from, to) => supabase
      .from("control_models")
      .select(`
        id,name,description,status,valid_from,valid_until,created_by,created_at,
        users(name),
        model_business_units(business_unit_id),
        verticals(
          id,name,description,weight,evaluation_mode,contains_process,sort_order,
          parameters(
            id,name,description,base_points,allows_intermediate,sort_order
          )
        )
      `)
      .order("created_at", { ascending: false })
      .range(from, to)
      .abortSignal(signal)) : emptyResult(),
    needs("settings", "planning", "evaluations", "dashboard") ? fetchAllPages((from, to) => {
      let query = supabase
        .from("lots")
        .select("id,business_unit_id,model_id,cycle_id,status,cycles(year,bimester),lot_auditors(auditor_id)")
      if (scope.lotId) query = query.eq("id", scope.lotId)
      return query.order("created_at", { ascending: false }).range(from, to).abortSignal(signal)
    }) : emptyResult(),
    needs("planning", "evaluations", "dashboard") ? fetchAllPages((from, to) => {
      let query = supabase
        .from("lot_verticals")
        .select(`
          id,lot_id,vertical_id,
          controls(
            id,lot_vertical_id,identifier,description,status,control_score,process,subprocess,
            subprocesses,corresponds_to_process,product,tag,catalog_item_id,linked_products,auditor_id,created_at
          )
        `)
      if (scope.lotId) query = query.eq("lot_id", scope.lotId)
      return query.range(from, to).abortSignal(signal)
    }) : emptyResult(),
    needs("planning", "evaluations", "dashboard") ? fetchAllPages((from, to) => {
      let query = supabase
        .from("audits")
        .select("id,lot_id,control_id,audit_date,status,total_score,auditor_id")
      if (scope.lotId) query = query.eq("lot_id", scope.lotId)
      if (scope.controlId) query = query.eq("control_id", scope.controlId)
      return query.order("audit_date", { ascending: false }).range(from, to).abortSignal(signal)
    }) : emptyResult(),
    !needs("evaluations", "dashboard") ? emptyResult() : requestedDomains.has("dashboard")
      ? fetchAllPages((from, to) => {
          let query = supabase
            .from("answers")
            .select("id,control_id,parameter_id,value,answered_at,auditor_id")
          if (currentProfile.role === "auditor") query = query.eq("auditor_id", currentProfile.id)
          if (scope.controlId) query = query.eq("control_id", scope.controlId)
          return query.range(from, to).abortSignal(signal)
        })
      : currentProfile.role === "auditor"
      ? fetchAllPages((from, to) => {
          let query = supabase
            .from("answers")
            .select("id,control_id,parameter_id,value,comment,audited_people,audited_roles,audited_areas,answered_at,auditor_id,answer_evidences(file_name,file_url)")
            .eq("auditor_id", currentProfile.id)
          if (scope.controlId) query = query.eq("control_id", scope.controlId)
          return query.range(from, to).abortSignal(signal)
        })
      : fetchAllPages((from, to) => {
          let query = supabase
            .from("answers")
            .select("id,control_id,parameter_id,value,comment,audited_people,audited_roles,audited_areas,answered_at,auditor_id,answer_evidences(file_name,file_url)")
          if (scope.controlId) query = query.eq("control_id", scope.controlId)
          return query.range(from, to).abortSignal(signal)
        }),
    needs("notifications") ? supabase
      .from("notifications")
      .select("id,user_id,title,message,type,read,created_at")
      .eq("user_id", currentProfile.id)
      .order("created_at", { ascending: false })
      .abortSignal(signal) : emptyResult(),
  ])

  // Compatibilidad defensiva para entornos que aún no tengan audited_areas.
  let normalizedAnswersResult: { data: DbAnswer[] | null; error: unknown } = {
    data: answersResult.data as DbAnswer[] | null,
    error: answersResult.error,
  }
  if (isMissingAuditedAreasColumn(answersResult.error)) {
    const fallbackResult = currentProfile.role === "auditor"
      ? await fetchAllPages((from, to) => {
          let query = supabase
            .from("answers")
            .select("id,control_id,parameter_id,value,comment,audited_people,audited_roles,answered_at,auditor_id,answer_evidences(file_name,file_url)")
            .eq("auditor_id", currentProfile.id)
          if (scope.controlId) query = query.eq("control_id", scope.controlId)
          return query.range(from, to).abortSignal(signal)
        })
      : await fetchAllPages((from, to) => {
          let query = supabase
            .from("answers")
            .select("id,control_id,parameter_id,value,comment,audited_people,audited_roles,answered_at,auditor_id,answer_evidences(file_name,file_url)")
          if (scope.controlId) query = query.eq("control_id", scope.controlId)
          return query.range(from, to).abortSignal(signal)
        })

    normalizedAnswersResult = {
      data: fallbackResult.data as DbAnswer[] | null,
      error: fallbackResult.error,
    }
  }

  // Cualquier error de una consulta invalida el conjunto para evitar datos parciales.
  const firstError = [
    usersResult.error,
    unitsResult.error,
    cyclesResult.error,
    thresholdsResult.error,
    catalogItemsResult.error,
    modelsResult.error,
    lotsResult.error,
    lotVerticalsResult.error,
    auditsResult.error,
    normalizedAnswersResult.error,
    notificationsResult.error,
  ].find(Boolean)

  if (firstError) {
    throw firstError
  }

  // Adapta snake_case, nulos y enums SQL al modelo consumido por React.
  const appData: AppData = {
    users: ((usersResult.data ?? []) as DbUser[]).map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      company: user.company ?? undefined,
      cargo: user.cargo ?? undefined,
      area: user.area ?? undefined,
      role: user.role,
      status: user.status,
      avatar: user.avatar ?? undefined,
    })),
    unidades: ((unitsResult.data ?? []) as DbBusinessUnit[]).map((unit) => ({
      id: unit.id,
      nombre: unit.name,
      ecosistema: unit.ecosystem,
      logo: unit.logo_url ?? undefined,
    })),
    ciclos: ((cyclesResult.data ?? []) as DbCycle[]).map((cycle) => ({
      id: cycle.id,
      año: cycle.year,
      bimestre: cycle.bimester,
      mesInicio: cycle.start_month ?? new Date(`${cycle.start_date}T00:00:00Z`).getUTCMonth() + 1,
      mesFin: cycle.end_month ?? new Date(`${cycle.end_date}T00:00:00Z`).getUTCMonth() + 1,
      fechaInicio: cycle.start_date,
      fechaFin: cycle.end_date,
      estado: cycle.status ?? "habilitado",
    })),
    umbrales: ((thresholdsResult.data ?? []) as DbThreshold[]).map((threshold) => ({
      id: threshold.id,
      nombre: threshold.name,
      min: Number(threshold.min_value),
      max: Number(threshold.max_value),
      color: normalizeThresholdColor(threshold.color, threshold.name),
    })),
    catalogItems: ((catalogItemsResult.data ?? []) as DbCatalogItem[]).map((item) => ({
      id: item.id,
      categoria: item.category,
      nombre: item.name,
      descripcion: item.description ?? undefined,
      subprocesos: item.subprocesses ?? [],
      unidadNegocioId: item.business_unit_id ?? undefined,
      productoVinculadoId: item.linked_product_id ?? undefined,
      productosVinculadosIds: item.catalog_process_products?.map((relation) => relation.product_id) ?? (item.linked_product_id ? [item.linked_product_id] : []),
      estado: item.status,
      fechaCreacion: item.created_at,
    })),
    modelos: ((modelsResult.data ?? []) as unknown as DbModel[]).map((model) => ({
      id: model.id,
      nombre: model.name,
      descripcion: model.description ?? undefined,
      estado: model.status,
      fechaVigenciaDesde: model.valid_from ?? undefined,
      fechaVigenciaHasta: model.valid_until ?? undefined,
      verticales: [...(model.verticals ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(mapVertical),
      creadoPor: model.users?.name ?? model.created_by,
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
        etiqueta: control.tag ?? undefined,
        catalogItemId: control.catalog_item_id ?? undefined,
        proceso: control.process ?? undefined,
        subproceso: control.subprocess ?? undefined,
        subprocesos: control.subprocesses ?? undefined,
        correspondeProceso: control.corresponds_to_process,
        producto: control.product ?? undefined,
        productosVinculados: control.linked_products ?? undefined,
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
    respuestas: ((normalizedAnswersResult.data ?? []) as DbAnswer[]).map((answer) => ({
      id: answer.id,
      controlId: answer.control_id,
      parametroId: answer.parameter_id,
      valor: answer.value,
      comentario: answer.comment ?? undefined,
      evidencias: ((answer.answer_evidences as DbAnswer["answer_evidences"]) ?? []).map((evidence) => evidence.file_name || evidence.file_url),
      personasAuditadas: (answer.audited_people ?? []).filter(Boolean),
      cargosAuditados: (answer.audited_roles ?? []).filter(Boolean),
      areasAuditadas: (answer.audited_areas ?? []).filter(Boolean),
      fechaRespuesta: answer.answered_at,
      auditorId: answer.auditor_id,
    })),
    answeredControlIds: ((normalizedAnswersResult.data ?? []) as DbAnswer[])
      .map((answer) => answer.control_id),
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

  // Los roles de gestión conservan el conjunto autorizado íntegro por RLS.
  if (currentProfile?.role !== "auditor") {
    return appData
  }

  // El auditor ve todo el lote asignado para contexto, aunque solo edite sus controles.
  const assignedLotIds = new Set(
    appData.lotes
      .filter((lot) => lot.auditores.includes(currentProfile.id))
      .map((lot) => lot.id),
  )
  const assignedModelIds = new Set(
    appData.lotes
      .filter((lot) => assignedLotIds.has(lot.id))
      .map((lot) => lot.modeloControlId),
  )
  const assignedLoteVerticales = appData.loteVerticales
    .filter((lotVertical) => assignedLotIds.has(lotVertical.loteId))
    .map((lotVertical) => {
      return {
        ...lotVertical,
        controles: lotVertical.controles,
      }
    })
  const assignedControlIds = new Set(
    assignedLoteVerticales.flatMap((lotVertical) =>
      lotVertical.controles.map((control) => control.id),
    ),
  )

  return {
    ...appData,
    unidades: appData.unidades,
    modelos: appData.modelos.filter((model) => assignedModelIds.has(model.id)),
    lotes: appData.lotes.filter((lot) => assignedLotIds.has(lot.id)),
    loteVerticales: assignedLoteVerticales,
    auditorias: appData.auditorias.filter((audit) => assignedLotIds.has(audit.loteId)),
    respuestas: appData.respuestas.filter((answer) => assignedControlIds.has(answer.controlId)),
    answeredControlIds: appData.answeredControlIds.filter((controlId) => assignedControlIds.has(controlId)),
    notificaciones: appData.notificaciones,
  }
}

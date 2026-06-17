"use client"

import { supabase } from "@/lib/supabase"
import type {
  Auditoria,
  Ciclo,
  Control,
  DescargoAuditado,
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

export type AppData = {
  users: User[]
  unidades: UnidadNegocio[]
  ciclos: Ciclo[]
  umbrales: Umbral[]
  modelos: ModeloControl[]
  lotes: Lote[]
  loteVerticales: LoteVertical[]
  auditorias: Auditoria[]
  respuestas: Respuesta[]
  answeredControlIds: string[]
  notificaciones: Notificacion[]
}

export type ControlModelInput = {
  name: string
  description?: string
  status: ModeloControl["estado"]
  verticals: Array<{
    name: string
    weight: number
    evaluationMode: Vertical["tipoEvaluacion"]
    containsProcess?: boolean
    parameters: Array<{
      name: string
      description?: string
      basePoints: number
      allowsIntermediate: boolean
    }>
  }>
}

export type EvaluationAnswerInput = {
  parametroId: string
  valor: "cumple" | "no_cumple" | "intermedio" | "na" | null
  comentario?: string
  personasAuditadas: string[]
  cargos: string[]
  areas: string[]
  fechaRespuesta?: string
}

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
  status?: Ciclo["estado"] | null
}

type DbThreshold = {
  id: string
  name: string
  min_value: number
  max_value: number
  color: Umbral["color"]
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

type DbControl = {
  id: string
  lot_vertical_id: string
  identifier: string
  description: string | null
  status: Control["estado"] | "terminada"
  control_score: number | null
  tag: Control["etiqueta"] | null
  process: string | null
  subprocess: string | null
  subprocesses: string[] | null
  corresponds_to_process: boolean
  product: string | null
  linked_products: string[] | null
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
  audited_response_notes?: DbAuditedResponseNote[]
}

type DbAuditedResponseNote = {
  id: string
  answer_id: string
  user_id: string
  comment: string | null
  file_url: string | null
  file_name: string | null
  created_at: string
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

function isMissingAuditedAreasColumn(error: unknown) {
  if (!error || typeof error !== "object") return false
  const record = error as Record<string, unknown>
  return record.code === "42703" || (typeof record.message === "string" && record.message.includes("audited_areas"))
}

function getMissingAuditedAreasError() {
  return new Error("No se pudo guardar el area auditada porque falta la columna audited_areas en Supabase. Aplica la migracion 20260601100000_add_answer_audited_areas.sql.")
}

function isMissingCycleStatusColumn(error: unknown) {
  if (!error || typeof error !== "object") return false
  const record = error as Record<string, unknown>
  return record.code === "42703" || (typeof record.message === "string" && record.message.includes("status"))
}

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

function auditedPeopleMatchUser(answer: Pick<Respuesta, "personasAuditadas">, user: Pick<User, "name" | "email">) {
  const userKeys = [user.name, user.email].map(normalizeLookupValue).filter(Boolean)
  const auditedKeys = (answer.personasAuditadas ?? []).map(normalizeLookupValue).filter(Boolean)

  return auditedKeys.some((auditedKey) =>
    userKeys.some((userKey) => auditedKey === userKey || auditedKey.includes(userKey) || userKey.includes(auditedKey)),
  )
}

function normalizeAuditStatus(status: DbAudit["status"]): Auditoria["estado"] {
  if (status === "terminado") return "terminada"
  return status
}

async function fetchCyclesData(): Promise<{ data: DbCycle[] | null; error: unknown }> {
  const result = await supabase.from("cycles").select("id,year,bimester,start_date,end_date,status").order("year").order("bimester")

  if (isMissingCycleStatusColumn(result.error)) {
    const fallbackResult = await supabase.from("cycles").select("id,year,bimester,start_date,end_date").order("year").order("bimester")
    return { data: fallbackResult.data as DbCycle[] | null, error: fallbackResult.error }
  }

  return { data: result.data as DbCycle[] | null, error: result.error }
}

export async function fetchAppData(profile?: Pick<User, "id" | "role" | "status">): Promise<AppData> {
  const currentProfile = profile ?? await getCurrentProfile()
  const [
    usersResult,
    unitsResult,
    cyclesResult,
    thresholdsResult,
    modelsResult,
    lotsResult,
    lotVerticalsResult,
    auditsResult,
    answersResult,
    notificationsResult,
  ] = await Promise.all([
    supabase.from("users").select("id,name,email,company,cargo,area,role,status,avatar").order("name"),
    supabase.from("business_units").select("id,name,ecosystem,code,zone,owner_name,logo_url").order("name"),
    fetchCyclesData(),
    supabase.from("thresholds").select("id,name,min_value,max_value,color").order("min_value"),
    supabase
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
          subprocesses,corresponds_to_process,product,tag,linked_products,auditor_id,created_at
        )
      `),
    supabase.from("audits").select("id,lot_id,control_id,audit_date,status,total_score,auditor_id").order("audit_date", { ascending: false }),
    currentProfile.role === "auditor"
      ? supabase
          .from("answers")
          .select("id,control_id,parameter_id,value,comment,audited_people,audited_roles,audited_areas,answered_at,auditor_id,answer_evidences(file_name,file_url),audited_response_notes(id,answer_id,user_id,comment,file_url,file_name,created_at)")
          .eq("auditor_id", currentProfile.id)
      : supabase
          .from("answers")
          .select("id,control_id,parameter_id,value,comment,audited_people,audited_roles,audited_areas,answered_at,auditor_id,answer_evidences(file_name,file_url),audited_response_notes(id,answer_id,user_id,comment,file_url,file_name,created_at)"),
    supabase
      .from("notifications")
      .select("id,user_id,title,message,type,read,created_at")
      .eq("user_id", currentProfile.id)
      .order("created_at", { ascending: false }),
  ])

  let normalizedAnswersResult: { data: DbAnswer[] | null; error: unknown } = {
    data: answersResult.data as DbAnswer[] | null,
    error: answersResult.error,
  }
  if (isMissingAuditedAreasColumn(answersResult.error)) {
    const fallbackResult = currentProfile.role === "auditor"
      ? await supabase
          .from("answers")
          .select("id,control_id,parameter_id,value,comment,audited_people,audited_roles,answered_at,auditor_id,answer_evidences(file_name,file_url),audited_response_notes(id,answer_id,user_id,comment,file_url,file_name,created_at)")
          .eq("auditor_id", currentProfile.id)
      : await supabase
          .from("answers")
          .select("id,control_id,parameter_id,value,comment,audited_people,audited_roles,answered_at,auditor_id,answer_evidences(file_name,file_url),audited_response_notes(id,answer_id,user_id,comment,file_url,file_name,created_at)")

    normalizedAnswersResult = {
      data: fallbackResult.data as DbAnswer[] | null,
      error: fallbackResult.error,
    }
  }

  const firstError = [
    usersResult.error,
    unitsResult.error,
    cyclesResult.error,
    thresholdsResult.error,
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
      estado: cycle.status ?? "habilitado",
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
      descargosAuditado: ((answer.audited_response_notes ?? []) as DbAuditedResponseNote[]).map((note): DescargoAuditado => ({
        id: note.id,
        respuestaId: note.answer_id,
        usuarioId: note.user_id,
        comentario: note.comment ?? undefined,
        evidencia: note.file_name ?? undefined,
        evidenciaUrl: note.file_url ?? undefined,
        fecha: note.created_at,
      })),
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

  if (currentProfile?.role === "auditado") {
    const auditedControlIds = new Set(
      appData.respuestas
        .filter((answer) => auditedPeopleMatchUser(answer, { name: appData.users.find((user) => user.id === currentProfile.id)?.name ?? "", email: appData.users.find((user) => user.id === currentProfile.id)?.email ?? "" }))
        .map((answer) => answer.controlId),
    )
    const assignedLotIds = new Set(
      appData.loteVerticales
        .filter((lotVertical) => lotVertical.controles.some((control) => auditedControlIds.has(control.id)))
        .map((lotVertical) => lotVertical.loteId),
    )
    const assignedModelIds = new Set(
      appData.lotes
        .filter((lot) => assignedLotIds.has(lot.id))
        .map((lot) => lot.modeloControlId),
    )

    return {
      ...appData,
      modelos: appData.modelos.filter((model) => assignedModelIds.has(model.id)),
      lotes: appData.lotes.filter((lot) => assignedLotIds.has(lot.id)),
      loteVerticales: appData.loteVerticales
        .filter((lotVertical) => assignedLotIds.has(lotVertical.loteId))
        .map((lotVertical) => ({
          ...lotVertical,
          controles: lotVertical.controles.filter((control) => auditedControlIds.has(control.id)),
        })),
      auditorias: appData.auditorias.filter((audit) => auditedControlIds.has(audit.controlId)),
      respuestas: appData.respuestas.filter((answer) => auditedControlIds.has(answer.controlId)),
      answeredControlIds: Array.from(auditedControlIds),
      notificaciones: appData.notificaciones,
    }
  }

  if (currentProfile?.role !== "auditor") {
    return appData
  }

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

  return {
    ...appData,
    unidades: appData.unidades,
    modelos: appData.modelos.filter((model) => assignedModelIds.has(model.id)),
    lotes: appData.lotes.filter((lot) => assignedLotIds.has(lot.id)),
    loteVerticales: assignedLoteVerticales,
    auditorias: appData.auditorias.filter((audit) => audit.auditorId === currentProfile.id),
    respuestas: appData.respuestas.filter((answer) => answer.auditorId === currentProfile.id),
    notificaciones: appData.notificaciones,
  }
}

async function getCurrentProfile() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  const authUser = sessionData.session?.user
  const authUserId = authUser?.id
  if (!authUserId) throw new Error("Debes iniciar sesion para guardar datos.")

  const { data, error } = await supabase.from("users").select("id,role,status").eq("auth_user_id", authUserId).maybeSingle()
  if (error) throw error
  if (data?.id) return data as Pick<User, "id" | "role" | "status">

  const email = authUser.email ?? ""
  const displayName =
    authUser.user_metadata?.name ||
    authUser.user_metadata?.full_name ||
    email.split("@")[0] ||
    "Usuario"

  const { data: existingByEmail, error: emailError } = await supabase
    .from("users")
    .select("id,role,status")
    .eq("email", email)
    .maybeSingle()

  if (emailError) throw emailError

  if (existingByEmail?.id) {
    const { data: linkedProfile, error: linkError } = await supabase
      .from("users")
      .update({ auth_user_id: authUserId })
      .eq("id", existingByEmail.id)
      .select("id,role,status")
      .single()

    if (linkError) throw linkError
    return linkedProfile as Pick<User, "id" | "role" | "status">
  }

  const { data: createdProfile, error: insertError } = await supabase
    .from("users")
    .insert({
      auth_user_id: authUserId,
      name: displayName,
      email,
      company: authUser.user_metadata?.company || authUser.user_metadata?.empresa || null,
      cargo: authUser.user_metadata?.cargo || null,
      area: authUser.user_metadata?.area || null,
      role: "auditor",
      status: "activo",
    })
    .select("id,role,status")
    .single()

  if (insertError) throw insertError
  return createdProfile as Pick<User, "id" | "role" | "status">
}

async function getCurrentProfileId() {
  const profile = await getCurrentProfile()
  return profile.id
}

async function requirePlanningManager() {
  const profile = await getCurrentProfile()
  if (profile.role !== "admin" && profile.role !== "supervisor") {
    throw new Error("Solo supervisor o admin pueden gestionar lotes.")
  }

  return profile
}

async function requireControlManager() {
  const profile = await getCurrentProfile()
  if (profile.role !== "admin" && profile.role !== "supervisor" && profile.role !== "auditor") {
    throw new Error("No tienes permiso para gestionar controles.")
  }

  return profile
}

async function assertCanManageControlsForLotVertical(lotVerticalId: string, lotId?: string) {
  const profile = await requireControlManager()

  let resolvedLotId = lotId
  if (!resolvedLotId) {
    const { data, error } = await supabase
      .from("lot_verticals")
      .select("lot_id")
      .eq("id", lotVerticalId)
      .maybeSingle()

    if (error) throw error
    resolvedLotId = (data?.lot_id as string | undefined) ?? undefined
  }

  if (!resolvedLotId) throw new Error("No se pudo validar el lote del control.")

  const { data: lot, error: lotError } = await supabase
    .from("lots")
    .select("status")
    .eq("id", resolvedLotId)
    .maybeSingle()

  if (lotError) throw lotError
  if (!lot || lot.status !== "abierto") {
    throw new Error("Solo se pueden modificar controles mientras el lote esta abierto.")
  }

  if (profile.role !== "auditor") return profile

  const { data: assignment, error: assignmentError } = await supabase
    .from("lot_auditors")
    .select("lot_id")
    .eq("lot_id", resolvedLotId)
    .eq("auditor_id", profile.id)
    .maybeSingle()

  if (assignmentError) throw assignmentError
  if (!assignment) {
    throw new Error("Solo puedes cargar controles en lotes asignados a tu usuario.")
  }

  return profile
}

async function assertCanManageExistingControl(controlId: string) {
  const profile = await requireControlManager()

  const { data, error } = await supabase
    .from("controls")
    .select("status,lot_vertical_id,lot_verticals(lot_id,lots(status))")
    .eq("id", controlId)
    .maybeSingle()

  if (error) throw error
  if (!data?.lot_vertical_id) throw new Error("No se pudo validar el control.")

  const lotVerticalRelation = data.lot_verticals as unknown as { lot_id?: string; lots?: { status?: Lote["estado"] } | { status?: Lote["estado"] }[] | null } | { lot_id?: string; lots?: { status?: Lote["estado"] } | { status?: Lote["estado"] }[] | null }[] | null
  const lotVertical = Array.isArray(lotVerticalRelation) ? lotVerticalRelation[0] : lotVerticalRelation
  const lotRelation = Array.isArray(lotVertical?.lots) ? lotVertical?.lots[0] : lotVertical?.lots

  if (lotRelation?.status !== "abierto") {
    throw new Error("Solo se pueden modificar controles mientras el lote esta abierto.")
  }

  if (profile.role !== "auditor") return profile

  if (normalizeControlStatus(data.status as DbControl["status"]) === "terminado") {
    throw new Error("Los controles terminados solo pueden ser modificados por supervisor o admin.")
  }

  return assertCanManageControlsForLotVertical(data.lot_vertical_id as string)
}

async function requireAdmin() {
  const profile = await getCurrentProfile()
  if (profile.role !== "admin") {
    throw new Error("Solo admin puede realizar esta accion.")
  }

  return profile
}

async function requireAdminOrSupervisor() {
  const profile = await getCurrentProfile()
  if (profile.role !== "admin" && profile.role !== "supervisor") {
    throw new Error("Solo supervisor o admin puede realizar esta accion.")
  }

  return profile
}

async function assertCanEvaluateControl(controlId: string) {
  const profile = await getCurrentProfile()
  if (profile.role !== "auditor") {
    throw new Error("Solo el auditor asignado puede modificar una evaluacion.")
  }

  const { data, error } = await supabase
    .from("controls")
    .select("auditor_id,lot_verticals(lots(cycles(start_date,end_date,status)))")
    .eq("id", controlId)
    .maybeSingle()

  if (error) throw error
  if (!data || data.auditor_id !== profile.id) {
    throw new Error("No tienes permiso para evaluar este control.")
  }

  const lotVerticalRelation = data.lot_verticals as unknown as
    | { lots?: { cycles?: Pick<DbCycle, "start_date" | "end_date" | "status"> | Pick<DbCycle, "start_date" | "end_date" | "status">[] | null } | { cycles?: Pick<DbCycle, "start_date" | "end_date" | "status"> | Pick<DbCycle, "start_date" | "end_date" | "status">[] | null }[] | null }
    | { lots?: { cycles?: Pick<DbCycle, "start_date" | "end_date" | "status"> | Pick<DbCycle, "start_date" | "end_date" | "status">[] | null } | { cycles?: Pick<DbCycle, "start_date" | "end_date" | "status"> | Pick<DbCycle, "start_date" | "end_date" | "status">[] | null }[] | null }[]
    | null
  const lotVertical = Array.isArray(lotVerticalRelation) ? lotVerticalRelation[0] : lotVerticalRelation
  const lotRelation = Array.isArray(lotVertical?.lots) ? lotVertical?.lots[0] : lotVertical?.lots
  const cycleRelation = Array.isArray(lotRelation?.cycles) ? lotRelation?.cycles[0] : lotRelation?.cycles

  if (!cycleRelation) {
    throw new Error("No se pudo validar el ciclo del lote.")
  }

  const now = Date.now()
  const startsAt = new Date(`${cycleRelation.start_date}T00:00:00`).getTime()
  const endsAt = new Date(`${cycleRelation.end_date}T23:59:59`).getTime()
  if ((cycleRelation.status ?? "habilitado") !== "habilitado") {
    throw new Error("El ciclo del lote esta deshabilitado.")
  }
  if (now < startsAt) {
    throw new Error("La evaluacion estara disponible cuando el ciclo del lote entre en vigor.")
  }
  if (now > endsAt) {
    throw new Error("El ciclo del lote ya finalizo.")
  }

  return profile
}

async function assertCanReadControl(controlId: string) {
  const profile = await getCurrentProfile()
  if (profile.role === "admin" || profile.role === "supervisor") return profile
  if (profile.role === "auditado") {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id,name,email")
      .eq("id", profile.id)
      .maybeSingle()

    if (userError) throw userError
    if (!user) throw new Error("No tienes permiso para ver este control.")

    const { data: answers, error: answersError } = await supabase
      .from("answers")
      .select("audited_people,controls(status)")
      .eq("control_id", controlId)

    if (answersError) throw answersError

    const canRead = (answers ?? []).some((answer) => {
      const controlRelation = answer.controls as unknown as { status?: DbControl["status"] } | { status?: DbControl["status"] }[] | null
      const relatedControl = Array.isArray(controlRelation) ? controlRelation[0] : controlRelation
      const isReplica = relatedControl?.status === "en_replica" || relatedControl?.status === "terminado" || relatedControl?.status === "terminada"

      return isReplica && auditedPeopleMatchUser(
        { personasAuditadas: ((answer.audited_people as string[] | null) ?? []) },
        { name: user.name as string, email: user.email as string },
      )
    })

    if (!canRead) throw new Error("No tienes permiso para ver este control.")
    return profile
  }

  const { data, error } = await supabase
    .from("controls")
    .select("auditor_id,lot_verticals(lot_id)")
    .eq("id", controlId)
    .maybeSingle()

  if (error) throw error
  const lotVerticalRelation = data?.lot_verticals as unknown as { lot_id?: string } | { lot_id?: string }[] | null
  const lotId = Array.isArray(lotVerticalRelation)
    ? lotVerticalRelation[0]?.lot_id
    : lotVerticalRelation?.lot_id

  if (!data || !lotId) {
    throw new Error("No tienes permiso para ver este control.")
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("lot_auditors")
    .select("lot_id")
    .eq("lot_id", lotId)
    .eq("auditor_id", profile.id)
    .maybeSingle()

  if (assignmentError) throw assignmentError
  if (!assignment) throw new Error("No tienes permiso para ver este control.")

  return profile
}

async function assertCanRespondAsAudited(answerId: string) {
  const profile = await getCurrentProfile()
  if (profile.role !== "auditado") {
    throw new Error("Solo el perfil auditado puede agregar descargos.")
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id,name,email")
    .eq("id", profile.id)
    .maybeSingle()

  if (userError) throw userError
  if (!user) throw new Error("No se pudo validar el usuario auditado.")

  const { data: answer, error: answerError } = await supabase
    .from("answers")
    .select("id,audited_people,controls(status)")
    .eq("id", answerId)
    .maybeSingle()

  if (answerError) throw answerError

  const controlRelation = answer?.controls as unknown as { status?: DbControl["status"] } | { status?: DbControl["status"] }[] | null
  const control = Array.isArray(controlRelation) ? controlRelation[0] : controlRelation
  const isInReplica = control?.status === "en_replica" || control?.status === "terminado" || control?.status === "terminada"
  const isAssigned = auditedPeopleMatchUser(
    { personasAuditadas: ((answer?.audited_people as string[] | null) ?? []) },
    { name: user.name as string, email: user.email as string },
  )

  if (!answer || !isInReplica || !isAssigned) {
    throw new Error("No tienes permiso para agregar descargos en esta respuesta.")
  }

  return profile
}

function makeBusinessUnitCode(name: string) {
  const slug =
    name
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "UNIDAD"

  return `${slug}-${Date.now().toString(36).toUpperCase()}`
}

export async function createBusinessUnit(input: { name: string; ecosystem: string; logoUrl?: string | null }) {
  await requireAdminOrSupervisor()
  const { error } = await supabase.from("business_units").insert({
    name: input.name.trim(),
    ecosystem: input.ecosystem.trim(),
    code: makeBusinessUnitCode(input.name),
    zone: "",
    owner_name: "",
    logo_url: input.logoUrl || null,
  })

  if (error) throw error
}

export async function updateBusinessUnit(id: string, input: { name: string; ecosystem: string; logoUrl?: string | null }) {
  await requireAdminOrSupervisor()
  const { error } = await supabase
    .from("business_units")
    .update({
      name: input.name.trim(),
      ecosystem: input.ecosystem.trim(),
      logo_url: input.logoUrl || null,
    })
    .eq("id", id)

  if (error) throw error
}

export async function deleteBusinessUnit(id: string) {
  await requireAdmin()
  const { error } = await supabase.from("business_units").delete().eq("id", id)
  if (error) throw error
}

export async function updateUserProfile(
  id: string,
  input: { name?: string; role?: User["role"]; status?: User["status"]; cargo?: string; area?: string },
) {
  await requireAdmin()
  const payload = {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.role !== undefined ? { role: input.role } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.cargo !== undefined ? { cargo: input.cargo.trim() || null } : {}),
    ...(input.area !== undefined ? { area: input.area.trim() || null } : {}),
  }
  const { error } = await supabase.from("users").update(payload).eq("id", id)
  if (error) throw error
}

export async function assignUserPassword(id: string, password: string) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error("No se encontro una sesion valida.")

  const response = await fetch(`/api/users/${id}/password`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  })
  const result = (await response.json().catch(() => null)) as { error?: string } | null

  if (!response.ok) {
    throw new Error(result?.error || "No se pudo asignar la contrasena.")
  }
}

export async function updateOwnProfile(input: { name: string; company?: string; cargo?: string; area?: string; avatar?: string | null }) {
  const profile = await getCurrentProfile()
  const { error } = await supabase
    .from("users")
    .update({
      name: input.name.trim(),
      company: input.company?.trim() || null,
      cargo: input.cargo?.trim() || null,
      area: input.area?.trim() || null,
      avatar: input.avatar || null,
    })
    .eq("id", profile.id)

  if (error) throw error
}

export async function createCycle(input: { year: number; bimester: number }) {
  await requireAdminOrSupervisor()
  await ensureCycle(input.year, input.bimester)
}

export async function updateCycle(id: string, input: { year: number; bimester: number }) {
  await requireAdminOrSupervisor()
  const dates = getBimesterDates(input.year, input.bimester)
  const { error } = await supabase
    .from("cycles")
    .update({
      year: input.year,
      bimester: input.bimester,
      start_date: dates.startDate,
      end_date: dates.endDate,
    })
    .eq("id", id)

  if (error) throw error
}

export async function updateCycleStatus(id: string, status: NonNullable<Ciclo["estado"]>) {
  await requireAdminOrSupervisor()
  const { error } = await supabase.from("cycles").update({ status }).eq("id", id)
  if (error) throw error
}

export async function deleteCycle(id: string) {
  await requireAdminOrSupervisor()
  const { data: linkedLots, error: linkedLotsError } = await supabase
    .from("lots")
    .select("id")
    .eq("cycle_id", id)
    .limit(1)

  if (linkedLotsError) throw linkedLotsError
  if ((linkedLots ?? []).length > 0) {
    throw new Error("No se puede eliminar un ciclo vinculado a lotes.")
  }

  const { error } = await supabase.from("cycles").delete().eq("id", id)
  if (error) throw error
}

export async function updateThresholds(
  thresholds: Array<{ id: string; min: number; max: number }>,
) {
  await requireAdminOrSupervisor()
  for (const threshold of thresholds) {
    const { error } = await supabase
      .from("thresholds")
      .update({
        min_value: threshold.min,
        max_value: threshold.max,
      })
      .eq("id", threshold.id)

    if (error) throw error
  }
}

export async function createUserProfile(input: { name: string; email: string; role: User["role"]; company?: string; cargo?: string; area?: string }) {
  await requireAdmin()
  const { error } = await supabase.from("users").insert({
    name: input.name.trim(),
    email: input.email.trim(),
    company: input.company?.trim() || null,
    cargo: input.cargo?.trim() || null,
    area: input.area?.trim() || null,
    role: input.role,
    status: "activo",
  })

  if (error) throw error
}

async function insertModelVerticals(modelId: string, verticals: ControlModelInput["verticals"]) {
  for (const [verticalIndex, vertical] of verticals.entries()) {
    const { data: createdVertical, error: verticalError } = await supabase
      .from("verticals")
      .insert({
        model_id: modelId,
        name: vertical.name.trim(),
        weight: vertical.weight,
        evaluation_mode: vertical.evaluationMode,
        contains_process: vertical.containsProcess ?? false,
        sort_order: verticalIndex,
      })
      .select("id")
      .single()

    if (verticalError) throw verticalError

    for (const [parameterIndex, parameter] of vertical.parameters.filter((item) => item.name.trim()).entries()) {
      const { data: createdParameter, error: parameterError } = await supabase
        .from("parameters")
        .insert({
          vertical_id: createdVertical.id,
          name: parameter.name.trim(),
          description: parameter.description?.trim() || null,
          base_points: parameter.basePoints,
          allows_intermediate: parameter.allowsIntermediate,
          sort_order: parameterIndex,
        })
        .select("id")
        .single()

      if (parameterError) throw parameterError

      void createdParameter
    }
  }
}

export async function createControlModel(input: ControlModelInput) {
  const profile = await requireAdminOrSupervisor()
  const createdBy = profile.id

  const { data: model, error: modelError } = await supabase
    .from("control_models")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: input.status,
      created_by: createdBy,
    })
    .select("id")
    .single()

  if (modelError) throw modelError

  await insertModelVerticals(model.id, input.verticals)
}

export async function updateControlModelStatus(id: string, status: ModeloControl["estado"]) {
  await requireAdminOrSupervisor()
  const { error } = await supabase
    .from("control_models")
    .update({
      status,
      valid_until: status === "deprecado" ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq("id", id)
  if (error) throw error
}

export async function deleteControlModel(id: string) {
  await requireAdmin()

  const { count, error: usageError } = await supabase
    .from("lots")
    .select("id", { count: "exact", head: true })
    .eq("model_id", id)

  if (usageError) throw usageError
  if ((count ?? 0) > 0) {
    throw new Error("No se puede eliminar un modelo que ya esta asociado a lotes.")
  }

  const { error } = await supabase.from("control_models").delete().eq("id", id)
  if (error) throw error
}

export async function updateControlModel(id: string, input: ControlModelInput) {
  await requireAdminOrSupervisor()
  const { data: currentModel, error: currentModelError } = await supabase
    .from("control_models")
    .select("status")
    .eq("id", id)
    .single()

  if (currentModelError) throw currentModelError
  if (currentModel.status !== "borrador") {
    throw new Error("Solo se pueden editar modelos en estado borrador.")
  }

  const { error: modelError } = await supabase
    .from("control_models")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: input.status,
    })
    .eq("id", id)

  if (modelError) throw modelError

  const { error: deleteVerticalsError } = await supabase.from("verticals").delete().eq("model_id", id)
  if (deleteVerticalsError) throw deleteVerticalsError

  await insertModelVerticals(id, input.verticals)
}

export async function cloneControlModel(model: ModeloControl) {
  await createControlModel({
    name: `${model.nombre} copia`,
    description: model.descripcion,
    status: "borrador",
    verticals: model.verticales.map((vertical) => ({
      name: vertical.nombre,
      weight: vertical.peso,
      evaluationMode: vertical.tipoEvaluacion,
      containsProcess: vertical.contieneProceso,
      parameters: vertical.parametros.map((parameter) => ({
        name: parameter.nombre,
        description: parameter.descripcion,
        basePoints: parameter.puntosBase,
        allowsIntermediate: parameter.permiteIntermedio,
      })),
    })),
  })
}

function getBimesterDates(year: number, bimester: number) {
  const startMonth = (bimester - 1) * 2
  const start = new Date(Date.UTC(year, startMonth, 1))
  const end = new Date(Date.UTC(year, startMonth + 2, 0))

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

async function ensureCycle(year: number, bimester: number) {
  const { data: existing, error: existingError } = await supabase
    .from("cycles")
    .select("id")
    .eq("year", year)
    .eq("bimester", bimester)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return existing.id as string

  const dates = getBimesterDates(year, bimester)
  const { data: created, error: createError } = await supabase
    .from("cycles")
    .insert({
      year,
      bimester,
      start_date: dates.startDate,
      end_date: dates.endDate,
      status: "habilitado",
    })
    .select("id")
    .single()

  if (createError) throw createError
  return created.id as string
}

async function getEnabledCycleForLot(year: number, bimester: number) {
  const { data, error } = await supabase
    .from("cycles")
    .select("id,status")
    .eq("year", year)
    .eq("bimester", bimester)
    .maybeSingle()

  if (error) throw error
  if (!data?.id) throw new Error("El ciclo seleccionado no está habilitado para crear lotes.")
  if (((data.status as Ciclo["estado"] | null) ?? "habilitado") !== "habilitado") {
    throw new Error("El ciclo seleccionado está deshabilitado.")
  }

  return data.id as string
}

type NotificationDraft = {
  userId: string
  title: string
  message: string
  type: Notificacion["tipo"]
}

async function createNotifications(notifications: NotificationDraft[]) {
  if (!notifications.length) return

  const { error } = await supabase.from("notifications").insert(
    notifications.map((notification) => ({
      user_id: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: false,
    })),
  )

  if (error) throw error
}

async function getActiveManagers(excludeUserId?: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id,name,role,status")
    .in("role", ["supervisor", "admin"])
    .eq("status", "activo")

  if (error) throw error
  return (data ?? []).filter((user) => user.id !== excludeUserId)
}

async function getUserNames(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
  if (!uniqueIds.length) return new Map<string, string>()

  const { data, error } = await supabase
    .from("users")
    .select("id,name")
    .in("id", uniqueIds)

  if (error) throw error
  return new Map((data ?? []).map((user) => [user.id as string, user.name as string]))
}

async function getLotLabel(lotId: string) {
  const { data, error } = await supabase
    .from("lots")
    .select("business_units(name),control_models(name),cycles(year,bimester)")
    .eq("id", lotId)
    .maybeSingle()

  if (error) throw error

  const lot = data as {
    business_units?: { name?: string } | { name?: string }[] | null
    control_models?: { name?: string } | { name?: string }[] | null
    cycles?: { year?: number; bimester?: number } | { year?: number; bimester?: number }[] | null
  } | null
  const unit = Array.isArray(lot?.business_units) ? lot?.business_units[0] : lot?.business_units
  const model = Array.isArray(lot?.control_models) ? lot?.control_models[0] : lot?.control_models
  const cycle = Array.isArray(lot?.cycles) ? lot?.cycles[0] : lot?.cycles
  const unitName = unit?.name ?? "Unidad"
  const cycleLabel = cycle ? `Ciclo ${cycle.bimester} - ${cycle.year}` : "ciclo activo"

  return `${unitName} | ${cycleLabel}${model?.name ? ` | ${model.name}` : ""}`
}

async function notifyAuditorsAboutLot(lotId: string, auditorIds: string[]) {
  const recipients = Array.from(new Set(auditorIds.filter(Boolean)))
  if (!recipients.length) return

  const lotLabel = await getLotLabel(lotId)
  await createNotifications(
    recipients.map((auditorId) => ({
      userId: auditorId,
      title: "Lote asignado",
      message: `Se te ha asignado un lote, empieza a cargar tus controles. ${lotLabel}`,
      type: "asignacion" as const,
    })),
  )
}

async function notifyAuditorAboutControl(auditorId: string | undefined, controlName: string) {
  if (!auditorId) return

  await createNotifications([
    {
      userId: auditorId,
      title: "Control asignado",
      message: `Se te ha asignado un control: ${controlName}. Ve a evaluaciones para trabajarlo.`,
      type: "asignacion" as const,
    },
  ])
}

async function notifyAuditedUsersAboutReplica(controlId: string, actorId: string) {
  const { data: answers, error: answersError } = await supabase
    .from("answers")
    .select("audited_people,controls(identifier)")
    .eq("control_id", controlId)

  if (answersError) throw answersError

  const auditedPeople = Array.from(
    new Set(
      (answers ?? [])
        .flatMap((answer) => ((answer.audited_people as string[] | null) ?? []))
        .map((item) => normalizeLookupValue(item))
        .filter(Boolean),
    ),
  )
  if (!auditedPeople.length) return

  const { data: auditedUsers, error: usersError } = await supabase
    .from("users")
    .select("id,name,email")
    .eq("role", "auditado")
    .eq("status", "activo")

  if (usersError) throw usersError

  const recipients = (auditedUsers ?? []).filter((user) => {
    const userKeys = [user.name as string, user.email as string].map(normalizeLookupValue).filter(Boolean)
    return auditedPeople.some((auditedKey) =>
      userKeys.some((userKey) => auditedKey === userKey || auditedKey.includes(userKey) || userKey.includes(auditedKey)),
    )
  })
  if (!recipients.length) return

  const firstAnswer = answers?.[0] as { controls?: { identifier?: string } | { identifier?: string }[] | null } | undefined
  const controlRelation = firstAnswer?.controls
  const control = Array.isArray(controlRelation) ? controlRelation[0] : controlRelation
  const controlName = control?.identifier ?? "control"
  const usersById = await getUserNames([actorId])
  const actorName = usersById.get(actorId) ?? "Control de Calidad"

  await createNotifications(
    recipients.map((recipient) => ({
      userId: recipient.id as string,
      title: "Control recibido para replica",
      message: `${actorName} envio "${controlName}" a replica. Ya puedes agregar tus descargos en /evaluaciones/${controlId}.`,
      type: "replica" as const,
    })),
  )
}

export async function createLot(input: {
  businessUnitId: string
  modelId: string
  year: number
  bimester: number
  auditorIds: string[]
}) {
  await requirePlanningManager()
  const cycleId = await getEnabledCycleForLot(input.year, input.bimester)

  const { data: lot, error: lotError } = await supabase
    .from("lots")
    .insert({
      business_unit_id: input.businessUnitId,
      model_id: input.modelId,
      cycle_id: cycleId,
      status: "abierto",
    })
    .select("id")
    .single()

  if (lotError) throw lotError

  if (input.auditorIds.length) {
    const { error: auditorsError } = await supabase.from("lot_auditors").insert(
      input.auditorIds.map((auditorId) => ({
        lot_id: lot.id,
        auditor_id: auditorId,
      })),
    )
    if (auditorsError) throw auditorsError
  }

  const { data: verticals, error: verticalsError } = await supabase
    .from("verticals")
    .select("id")
    .eq("model_id", input.modelId)
    .order("sort_order")

  if (verticalsError) throw verticalsError

  if (verticals?.length) {
    const { error: lotVerticalsError } = await supabase.from("lot_verticals").insert(
      verticals.map((vertical) => ({
        lot_id: lot.id,
        vertical_id: vertical.id,
      })),
    )
    if (lotVerticalsError) throw lotVerticalsError
  }

  await notifyAuditorsAboutLot(lot.id as string, input.auditorIds)
}

export async function updateLotStatus(id: string, status: Lote["estado"]) {
  await requirePlanningManager()
  const { data: currentLot, error: currentLotError } = await supabase
    .from("lots")
    .select("cycle_id")
    .eq("id", id)
    .maybeSingle()

  if (currentLotError) throw currentLotError
  if (!currentLot?.cycle_id) throw new Error("No se pudo validar el ciclo del lote.")

  if (status === "cerrado") {
    const { data: controls, error: controlsError } = await supabase
      .from("controls")
      .select("id,status,lot_verticals!inner(lot_id)")
      .eq("lot_verticals.lot_id", id)

    if (controlsError) throw controlsError
    if (!controls?.length) {
      throw new Error("No se puede cerrar un lote sin controles cargados.")
    }

    const unfinishedControls = controls.filter((control) => normalizeControlStatus(control.status as DbControl["status"]) !== "terminado")
    if (unfinishedControls.length > 0) {
      throw new Error("No se puede cerrar el lote hasta que todos sus controles esten terminados.")
    }
  }

  const { error } = await supabase.from("lots").update({ status }).eq("id", id)
  if (error) throw error

  if (status === "cerrado") {
    const { data: cycleLots, error: cycleLotsError } = await supabase
      .from("lots")
      .select("id,status")
      .eq("cycle_id", currentLot.cycle_id)
      .neq("status", "deprecado")

    if (cycleLotsError) throw cycleLotsError
    if ((cycleLots ?? []).length > 0 && (cycleLots ?? []).every((lot) => lot.status === "cerrado")) {
      const { error: cycleError } = await supabase
        .from("cycles")
        .update({ status: "deshabilitado" })
        .eq("id", currentLot.cycle_id)

      if (cycleError) throw cycleError
    }
  }

  if (status === "abierto") {
    const { error: cycleError } = await supabase
      .from("cycles")
      .update({ status: "habilitado" })
      .eq("id", currentLot.cycle_id)

    if (cycleError) throw cycleError
  }
}

export async function addLotAuditor(lotId: string, auditorId: string) {
  await requirePlanningManager()
  const { data: existingAssignment, error: existingError } = await supabase
    .from("lot_auditors")
    .select("lot_id")
    .eq("lot_id", lotId)
    .eq("auditor_id", auditorId)
    .maybeSingle()

  if (existingError) throw existingError

  const { error } = await supabase
    .from("lot_auditors")
    .upsert(
      {
        lot_id: lotId,
        auditor_id: auditorId,
      },
      { onConflict: "lot_id,auditor_id" },
    )

  if (error) throw error
  if (!existingAssignment) await notifyAuditorsAboutLot(lotId, [auditorId])
}

async function notifySupervisorsAboutReassignment(input: {
  lotId?: string
  controlName: string
  fromAuditorId: string
  toAuditorId: string
  actorId: string
}) {
  const recipients = await getActiveManagers(input.actorId)
  if (!recipients.length) return

  const usersById = await getUserNames([input.fromAuditorId, input.toAuditorId, input.actorId])
  const actorName = usersById.get(input.actorId) ?? "Un usuario"
  const fromName = usersById.get(input.fromAuditorId) ?? "auditor anterior"
  const toName = usersById.get(input.toAuditorId) ?? "nuevo auditor"

  await createNotifications(
    recipients.map((recipient) => ({
      userId: recipient.id,
      title: "Reasignacion de control",
      message: `${actorName} reasigno "${input.controlName}" de ${fromName} a ${toName}.`,
      type: "asignacion" as const,
    })),
  )
}

export async function createControl(input: {
  lotVerticalId: string
  lotId?: string
  verticalId?: string
  identifier: string
  tag?: Control["etiqueta"]
  correspondsToProcess: boolean
  process?: string
  subprocesses?: string[]
  linkedProducts?: string[]
  auditorId?: string
}) {
  let lotVerticalId = input.lotVerticalId

  if (lotVerticalId.startsWith("lv-new-")) {
    if (!input.lotId || !input.verticalId) throw new Error("No se pudo vincular el control con la vertical del lote.")
    await assertCanManageControlsForLotVertical(lotVerticalId, input.lotId)

    const { data: lotVertical, error: lotVerticalError } = await supabase
      .from("lot_verticals")
      .upsert(
        {
          lot_id: input.lotId,
          vertical_id: input.verticalId,
        },
        { onConflict: "lot_id,vertical_id" },
      )
      .select("id")
      .single()

    if (lotVerticalError) throw lotVerticalError
    lotVerticalId = lotVertical.id as string
  } else {
    await assertCanManageControlsForLotVertical(lotVerticalId)
  }

  const { error } = await supabase.from("controls").insert({
    lot_vertical_id: lotVerticalId,
    identifier: input.identifier.trim(),
    status: "pendiente",
    tag: input.tag ?? null,
    corresponds_to_process: input.correspondsToProcess,
    process: input.process?.trim() || null,
    subprocess: input.subprocesses?.length ? input.subprocesses.join(", ") : null,
    subprocesses: input.subprocesses ?? [],
    product: input.tag === "Producto" ? input.identifier.trim() : null,
    linked_products: input.linkedProducts ?? [],
    auditor_id: input.auditorId || null,
  })

  if (error) throw error
  await notifyAuditorAboutControl(input.auditorId, input.identifier.trim())
}

export async function updateControl(input: {
  id: string
  identifier: string
  tag?: Control["etiqueta"]
  correspondsToProcess: boolean
  process?: string
  subprocesses?: string[]
  linkedProducts?: string[]
  auditorId?: string
}) {
  const profile = await assertCanManageExistingControl(input.id)
  const { data: previousControl, error: previousControlError } = await supabase
    .from("controls")
    .select("identifier,auditor_id,lot_verticals(lot_id)")
    .eq("id", input.id)
    .maybeSingle()

  if (previousControlError) throw previousControlError

  const { error } = await supabase
    .from("controls")
    .update({
      identifier: input.identifier.trim(),
      tag: input.tag ?? null,
      corresponds_to_process: input.correspondsToProcess,
      process: input.process?.trim() || null,
      subprocess: input.subprocesses?.length ? input.subprocesses.join(", ") : null,
      subprocesses: input.subprocesses ?? [],
      product: input.tag === "Producto" ? input.identifier.trim() : null,
      linked_products: input.linkedProducts ?? [],
      auditor_id: input.auditorId || null,
    })
    .eq("id", input.id)

  if (error) throw error

  const previousAuditorId = previousControl?.auditor_id as string | null | undefined
  const nextAuditorId = input.auditorId || undefined

  if (nextAuditorId && previousAuditorId !== nextAuditorId) {
    await notifyAuditorAboutControl(nextAuditorId, input.identifier.trim())
  }

  if (previousControl && previousAuditorId && nextAuditorId && previousAuditorId !== nextAuditorId) {
    const lotId = Array.isArray(previousControl.lot_verticals)
      ? previousControl.lot_verticals[0]?.lot_id
      : (previousControl.lot_verticals as { lot_id?: string } | null)?.lot_id
    await notifySupervisorsAboutReassignment({
      lotId,
      controlName: previousControl.identifier ?? input.identifier,
      fromAuditorId: previousAuditorId,
      toAuditorId: nextAuditorId,
      actorId: profile.id,
    })
  }
}

export async function deleteControl(id: string) {
  await assertCanManageExistingControl(id)
  const { error } = await supabase.from("controls").delete().eq("id", id)
  if (error) throw error
}

export async function fetchAnswersForControl(controlId: string) {
  await assertCanReadControl(controlId)
  const result = await supabase
    .from("answers")
    .select("id,parameter_id,value,comment,audited_people,audited_roles,audited_areas,answered_at,answer_evidences(file_name,file_url),audited_response_notes(id,answer_id,user_id,comment,file_url,file_name,created_at)")
    .eq("control_id", controlId)
  let answersData = result.data as DbAnswer[] | null
  let answersError: unknown = result.error

  if (isMissingAuditedAreasColumn(result.error)) {
    const fallbackResult = await supabase
      .from("answers")
      .select("id,parameter_id,value,comment,audited_people,audited_roles,answered_at,answer_evidences(file_name,file_url),audited_response_notes(id,answer_id,user_id,comment,file_url,file_name,created_at)")
      .eq("control_id", controlId)

    answersData = fallbackResult.data as DbAnswer[] | null
    answersError = fallbackResult.error
  }

  if (answersError) throw answersError

  return (answersData ?? []).map((answer) => ({
    id: answer.id as string,
    parametroId: answer.parameter_id as string,
    valor: answer.value as EvaluationAnswerInput["valor"],
    comentario: (answer.comment as string | null) ?? "",
    personasAuditadas: ((answer.audited_people as string[] | null) ?? []).length ? (answer.audited_people as string[]) : [""],
    cargos: ((answer.audited_roles as string[] | null) ?? []).length ? (answer.audited_roles as string[]) : [""],
    areas: ((answer.audited_areas as string[] | null) ?? []).length ? (answer.audited_areas as string[]) : [""],
    fechaRespuesta: answer.answered_at as string,
    evidencias: ((answer.answer_evidences as DbAnswer["answer_evidences"]) ?? []).map((evidence) => evidence.file_name || evidence.file_url),
    descargosAuditado: ((answer.audited_response_notes as DbAuditedResponseNote[] | undefined) ?? []).map((note): DescargoAuditado => ({
      id: note.id,
      respuestaId: note.answer_id,
      usuarioId: note.user_id,
      comentario: note.comment ?? undefined,
      evidencia: note.file_name ?? undefined,
      evidenciaUrl: note.file_url ?? undefined,
      fecha: note.created_at,
    })),
  }))
}

export async function saveAnswerEvidenceFiles(controlId: string, filesByParameter: Record<string, File[]>) {
  await assertCanEvaluateControl(controlId)
  const entries = Object.entries(filesByParameter).filter(([, files]) => files.length > 0)
  if (!entries.length) return

  const parameterIds = entries.map(([parameterId]) => parameterId)
  const { data: answers, error: answersError } = await supabase
    .from("answers")
    .select("id,parameter_id")
    .eq("control_id", controlId)
    .in("parameter_id", parameterIds)

  if (answersError) throw answersError

  const answerIdByParameter = new Map((answers ?? []).map((answer) => [answer.parameter_id as string, answer.id as string]))
  const evidenceRows: Array<{ answer_id: string; file_url: string; file_name: string; file_type: string | null }> = []

  for (const [parameterId, files] of entries) {
    const answerId = answerIdByParameter.get(parameterId)
    if (!answerId) continue

    for (const file of files) {
      const safeName = file.name.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-")
      const path = `${controlId}/${answerId}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage
        .from("answer-evidences")
        .upload(path, file, { contentType: file.type || undefined, upsert: false })

      if (uploadError) throw uploadError

      evidenceRows.push({
        answer_id: answerId,
        file_url: path,
        file_name: file.name,
        file_type: file.type || null,
      })
    }
  }

  if (evidenceRows.length) {
    const { error: evidenceError } = await supabase.from("answer_evidences").insert(evidenceRows)
    if (evidenceError) throw evidenceError
  }
}

export async function saveAuditedResponseNote(answerId: string, input: { comment?: string; files?: File[] }) {
  const profile = await assertCanRespondAsAudited(answerId)
  const comment = input.comment?.trim() || null
  const files = input.files ?? []

  if (!comment && files.length === 0) {
    throw new Error("Agrega un comentario o una evidencia para guardar el descargo.")
  }

  const rows: Array<{
    answer_id: string
    user_id: string
    comment: string | null
    file_url: string | null
    file_name: string | null
    file_type: string | null
  }> = []

  if (comment) {
    rows.push({
      answer_id: answerId,
      user_id: profile.id,
      comment,
      file_url: null,
      file_name: null,
      file_type: null,
    })
  }

  for (const file of files) {
    const safeName = file.name.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-")
    const path = `auditado/${answerId}/${profile.id}/${crypto.randomUUID()}-${safeName}`
    const { error: uploadError } = await supabase.storage
      .from("answer-evidences")
      .upload(path, file, { contentType: file.type || undefined, upsert: false })

    if (uploadError) throw uploadError

    rows.push({
      answer_id: answerId,
      user_id: profile.id,
      comment: null,
      file_url: path,
      file_name: file.name,
      file_type: file.type || null,
    })
  }

  const { error } = await supabase.from("audited_response_notes").insert(rows)
  if (error) throw error
}

async function notifySupervisorsAboutCompletion(input: {
  lotId: string
  auditorId: string
}) {
  const recipients = await getActiveManagers(input.auditorId)
  if (!recipients.length) return

  const { data: controlsData, error: controlsError } = await supabase
    .from("controls")
    .select("id,status,auditor_id,lot_verticals!inner(lot_id)")
    .eq("lot_verticals.lot_id", input.lotId)

  if (controlsError) throw controlsError

  const controls = (controlsData ?? []) as Array<{
    id: string
    status: Control["estado"] | "en_replica" | "terminada"
    auditor_id: string | null
  }>
  const auditorControls = controls.filter((control) => control.auditor_id === input.auditorId)
  const auditorFinished = auditorControls.length > 0 && auditorControls.every((control) => normalizeControlStatus(control.status) === "terminado")
  const lotFinished = controls.length > 0 && controls.every((control) => normalizeControlStatus(control.status) === "terminado")

  if (!auditorFinished && !lotFinished) return

  const [lotLabel, usersById] = await Promise.all([
    getLotLabel(input.lotId),
    getUserNames([input.auditorId]),
  ])
  const auditorName = usersById.get(input.auditorId) ?? "Un auditor"
  const notifications: NotificationDraft[] = []

  if (auditorFinished) {
    notifications.push(
      ...recipients.map((recipient) => ({
        userId: recipient.id,
        title: "Auditor termino sus controles",
        message: `${auditorName} ya termino todos sus controles asignados en ${lotLabel}.`,
        type: "cierre" as const,
      })),
    )
  }

  if (lotFinished) {
    notifications.push(
      ...recipients.map((recipient) => ({
        userId: recipient.id,
        title: "Lote completo",
        message: `El lote ${lotLabel} ya tiene todos sus controles completos.`,
        type: "cierre" as const,
      })),
    )
  }

  await createNotifications(notifications)
}

export async function saveEvaluationDraft(controlId: string, answers: EvaluationAnswerInput[]) {
  const profile = await assertCanEvaluateControl(controlId)
  const auditorId = profile.id

  if (!answers.length) return

  const rows = answers.map((answer) => ({
    control_id: controlId,
    parameter_id: answer.parametroId,
    value: answer.valor,
    comment: answer.comentario?.trim() || null,
    audited_people: answer.personasAuditadas.map((item) => item.trim()).filter(Boolean),
    audited_roles: answer.cargos.map((item) => item.trim()).filter(Boolean),
    audited_areas: answer.areas.map((item) => item.trim()).filter(Boolean),
    auditor_id: auditorId,
    answered_at: answer.fechaRespuesta ?? new Date().toISOString(),
  }))

  let { error } = await supabase.from("answers").upsert(
    rows,
    { onConflict: "control_id,parameter_id" },
  )

  if (isMissingAuditedAreasColumn(error)) {
    throw getMissingAuditedAreasError()
  }

  if (error) throw error
}

export async function finalizeEvaluation(input: {
  lotId: string
  controlId: string
  score: number | null
  answers: EvaluationAnswerInput[]
}) {
  const profile = await assertCanEvaluateControl(input.controlId)
  const auditorId = profile.id
  const { data: previousControl, error: previousControlError } = await supabase
    .from("controls")
    .select("status")
    .eq("id", input.controlId)
    .maybeSingle()

  if (previousControlError) throw previousControlError

  await saveEvaluationDraft(input.controlId, input.answers)

  const { error: controlError } = await supabase
    .from("controls")
    .update({
      status: "terminado",
      control_score: input.score,
      auditor_id: auditorId,
    })
    .eq("id", input.controlId)

  if (controlError) throw controlError

  const { error: auditError } = await supabase.from("audits").upsert(
    {
      lot_id: input.lotId,
      control_id: input.controlId,
      audit_date: new Date().toISOString().slice(0, 10),
      status: "terminado",
      total_score: input.score,
      auditor_id: auditorId,
    },
    { onConflict: "control_id" },
  )

  if (auditError) throw auditError

  if (normalizeControlStatus(previousControl?.status as DbControl["status"]) !== "terminado") {
    await notifySupervisorsAboutCompletion({
      lotId: input.lotId,
      auditorId,
    })
  }
}

export async function sendControlToReplica(controlId: string) {
  const profile = await assertCanEvaluateControl(controlId)
  const { error } = await supabase.from("controls").update({ status: "en_replica" }).eq("id", controlId)
  if (error) throw error
  await notifyAuditedUsersAboutReplica(controlId, profile.id)
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id)
  if (error) throw error
}

export async function markAllNotificationsRead(ids: string[]) {
  if (!ids.length) return
  const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids)
  if (error) throw error
}

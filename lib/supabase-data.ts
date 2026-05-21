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
  valor: "cumple" | "no_cumple" | "intermedio" | "na"
  comentario?: string
  personasAuditadas: string[]
  cargos: string[]
}

type DbUser = {
  id: string
  name: string
  email: string
  company: string | null
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
  const currentProfile = await getCurrentProfile()
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
    supabase.from("users").select("id,name,email,company,role,status,avatar").order("name"),
    supabase.from("business_units").select("id,name,ecosystem,code,zone,owner_name,logo_url").order("name"),
    supabase.from("cycles").select("id,year,bimester,start_date,end_date").order("year").order("bimester"),
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

  const appData: AppData = {
    users: ((usersResult.data ?? []) as DbUser[]).map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      company: user.company ?? undefined,
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

  if (currentProfile?.role !== "auditor") {
    return appData
  }

  const assignedLotIds = new Set(
    appData.lotes
      .filter((lot) => lot.auditores.includes(currentProfile.id))
      .map((lot) => lot.id),
  )
  const assignedUnitIds = new Set(
    appData.lotes
      .filter((lot) => assignedLotIds.has(lot.id))
      .map((lot) => lot.unidadNegocioId),
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
    unidades: appData.unidades.filter((unit) => assignedUnitIds.has(unit.id)),
    modelos: appData.modelos.filter((model) => assignedModelIds.has(model.id)),
    lotes: appData.lotes.filter((lot) => assignedLotIds.has(lot.id)),
    loteVerticales: assignedLoteVerticales,
    auditorias: appData.auditorias.filter((audit) => audit.auditorId === currentProfile.id),
    notificaciones: appData.notificaciones.filter((notification) => notification.usuarioId === currentProfile.id),
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
  if (profile.role !== "auditor") return profile

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
  if (profile.role !== "auditor") return profile

  const { data, error } = await supabase
    .from("controls")
    .select("lot_vertical_id")
    .eq("id", controlId)
    .maybeSingle()

  if (error) throw error
  if (!data?.lot_vertical_id) throw new Error("No se pudo validar el control.")

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
    .select("auditor_id")
    .eq("id", controlId)
    .maybeSingle()

  if (error) throw error
  if (!data || data.auditor_id !== profile.id) {
    throw new Error("No tienes permiso para evaluar este control.")
  }

  return profile
}

async function assertCanReadControl(controlId: string) {
  const profile = await getCurrentProfile()
  if (profile.role === "admin" || profile.role === "supervisor") return profile

  const { data, error } = await supabase
    .from("controls")
    .select("auditor_id")
    .eq("id", controlId)
    .maybeSingle()

  if (error) throw error
  if (!data || data.auditor_id !== profile.id) {
    throw new Error("No tienes permiso para ver este control.")
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
  await requireAdmin()
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

export async function updateUserProfile(id: string, input: { role?: User["role"]; status?: User["status"] }) {
  await requireAdmin()
  const { error } = await supabase.from("users").update(input).eq("id", id)
  if (error) throw error
}

export async function updateOwnProfile(input: { name: string; company?: string; avatar?: string | null }) {
  const profile = await getCurrentProfile()
  const { error } = await supabase
    .from("users")
    .update({
      name: input.name.trim(),
      company: input.company?.trim() || null,
      avatar: input.avatar || null,
    })
    .eq("id", profile.id)

  if (error) throw error
}

export async function createCycle(input: { year: number; bimester: number }) {
  await requireAdminOrSupervisor()
  await ensureCycle(input.year, input.bimester)
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

export async function createUserProfile(input: { name: string; email: string; role: User["role"]; company?: string }) {
  await requireAdmin()
  const { error } = await supabase.from("users").insert({
    name: input.name.trim(),
    email: input.email.trim(),
    company: input.company?.trim() || null,
    role: input.role,
    status: "activo",
  })

  if (error) throw error
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

  for (const [verticalIndex, vertical] of input.verticals.entries()) {
    const { data: createdVertical, error: verticalError } = await supabase
      .from("verticals")
      .insert({
        model_id: model.id,
        name: vertical.name.trim(),
        weight: vertical.weight,
        evaluation_mode: vertical.evaluationMode,
        contains_process: vertical.containsProcess ?? false,
        sort_order: verticalIndex,
      })
      .select("id")
      .single()

    if (verticalError) throw verticalError

    const parameters = vertical.parameters
      .filter((parameter) => parameter.name.trim())
      .map((parameter, parameterIndex) => ({
        vertical_id: createdVertical.id,
        name: parameter.name.trim(),
        description: parameter.description?.trim() || null,
        base_points: parameter.basePoints,
        allows_intermediate: parameter.allowsIntermediate,
        sort_order: parameterIndex,
      }))

    if (parameters.length) {
      const { error: parametersError } = await supabase.from("parameters").insert(parameters)
      if (parametersError) throw parametersError
    }
  }
}

export async function updateControlModelStatus(id: string, status: ModeloControl["estado"]) {
  await requireAdminOrSupervisor()
  const { error } = await supabase.from("control_models").update({ status }).eq("id", id)
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

  for (const [verticalIndex, vertical] of input.verticals.entries()) {
    const { data: createdVertical, error: verticalError } = await supabase
      .from("verticals")
      .insert({
        model_id: id,
        name: vertical.name.trim(),
        weight: vertical.weight,
        evaluation_mode: vertical.evaluationMode,
        contains_process: vertical.containsProcess ?? false,
        sort_order: verticalIndex,
      })
      .select("id")
      .single()

    if (verticalError) throw verticalError

    const parameters = vertical.parameters
      .filter((parameter) => parameter.name.trim())
      .map((parameter, parameterIndex) => ({
        vertical_id: createdVertical.id,
        name: parameter.name.trim(),
        description: parameter.description?.trim() || null,
        base_points: parameter.basePoints,
        allows_intermediate: parameter.allowsIntermediate,
        sort_order: parameterIndex,
      }))

    if (parameters.length) {
      const { error: parametersError } = await supabase.from("parameters").insert(parameters)
      if (parametersError) throw parametersError
    }
  }
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
    })
    .select("id")
    .single()

  if (createError) throw createError
  return created.id as string
}

export async function createLot(input: {
  businessUnitId: string
  modelId: string
  year: number
  bimester: number
  auditorIds: string[]
}) {
  await requirePlanningManager()
  const cycleId = await ensureCycle(input.year, input.bimester)

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
}

export async function updateLotStatus(id: string, status: Lote["estado"]) {
  await requirePlanningManager()
  const { error } = await supabase.from("lots").update({ status }).eq("id", id)
  if (error) throw error
}

export async function addLotAuditor(lotId: string, auditorId: string) {
  await requirePlanningManager()
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
}

export async function createControl(input: {
  lotVerticalId: string
  lotId?: string
  verticalId?: string
  identifier: string
  correspondsToProcess: boolean
  process?: string
  subprocesses?: string[]
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
    corresponds_to_process: input.correspondsToProcess,
    process: input.process?.trim() || null,
    subprocess: input.subprocesses?.length ? input.subprocesses.join(", ") : null,
    subprocesses: input.subprocesses ?? [],
    auditor_id: input.auditorId || null,
  })

  if (error) throw error
}

export async function updateControl(input: {
  id: string
  identifier: string
  correspondsToProcess: boolean
  process?: string
  subprocesses?: string[]
  auditorId?: string
}) {
  await assertCanManageExistingControl(input.id)
  const { error } = await supabase
    .from("controls")
    .update({
      identifier: input.identifier.trim(),
      corresponds_to_process: input.correspondsToProcess,
      process: input.process?.trim() || null,
      subprocess: input.subprocesses?.length ? input.subprocesses.join(", ") : null,
      subprocesses: input.subprocesses ?? [],
      auditor_id: input.auditorId || null,
    })
    .eq("id", input.id)

  if (error) throw error
}

export async function deleteControl(id: string) {
  await assertCanManageExistingControl(id)
  const { error } = await supabase.from("controls").delete().eq("id", id)
  if (error) throw error
}

export async function fetchAnswersForControl(controlId: string) {
  await assertCanReadControl(controlId)
  const { data, error } = await supabase
    .from("answers")
    .select("parameter_id,value,comment,audited_people,audited_roles")
    .eq("control_id", controlId)

  if (error) throw error

  return (data ?? []).map((answer) => ({
    parametroId: answer.parameter_id as string,
    valor: answer.value as EvaluationAnswerInput["valor"],
    comentario: (answer.comment as string | null) ?? "",
    personasAuditadas: ((answer.audited_people as string[] | null) ?? []).length ? (answer.audited_people as string[]) : [""],
    cargos: ((answer.audited_roles as string[] | null) ?? []).length ? (answer.audited_roles as string[]) : [""],
  }))
}

export async function saveEvaluationDraft(controlId: string, answers: EvaluationAnswerInput[]) {
  const profile = await assertCanEvaluateControl(controlId)
  const auditorId = profile.id

  if (!answers.length) return

  const { error } = await supabase.from("answers").upsert(
    answers.map((answer) => ({
      control_id: controlId,
      parameter_id: answer.parametroId,
      value: answer.valor,
      comment: answer.comentario?.trim() || null,
      audited_people: answer.personasAuditadas.map((item) => item.trim()).filter(Boolean),
      audited_roles: answer.cargos.map((item) => item.trim()).filter(Boolean),
      auditor_id: auditorId,
      answered_at: new Date().toISOString(),
    })),
    { onConflict: "control_id,parameter_id" },
  )

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
}

export async function sendControlToReplica(controlId: string) {
  await assertCanEvaluateControl(controlId)
  const { error } = await supabase.from("controls").update({ status: "en_replica" }).eq("id", controlId)
  if (error) throw error
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

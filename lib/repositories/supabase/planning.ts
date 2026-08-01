// Escrituras del dominio de planificación. Las operaciones de estructura del
// lote exigen permisos de gestión antes de invocar tablas o funciones SQL.
import type { Control, Lote } from "@/lib/data"
import { supabase } from "@/lib/supabase"
import { requireManager } from "./access"

type CreateControlInput = {
  lotVerticalId: string
  lotId?: string
  verticalId?: string
  identifier: string
  tag?: Control["etiqueta"]
  catalogItemId?: string
  correspondsToProcess: boolean
  process?: string
  subprocesses?: string[]
  linkedProducts?: string[]
  auditorId?: string
}

async function requireOpenLot(lotId: string) {
  const { data, error } = await supabase.from("lots").select("status").eq("id", lotId).single()
  if (error) throw error
  if (data.status !== "abierto") throw new Error("El lote ya no está abierto y no admite modificaciones.")
}

async function requireOpenLotForControl(controlId: string) {
  const { data: control, error: controlError } = await supabase.from("controls").select("lot_vertical_id").eq("id", controlId).single()
  if (controlError) throw controlError
  const { data: vertical, error: verticalError } = await supabase.from("lot_verticals").select("lot_id").eq("id", control.lot_vertical_id).single()
  if (verticalError) throw verticalError
  await requireOpenLot(vertical.lot_id)
}

export async function createLot(input: {
  businessUnitId: string
  modelId: string
  year: number
  bimester: number
  auditorIds: string[]
}) {
  await requireManager()
  const { error } = await supabase.rpc("create_audit_lot", { payload: input })
  if (error) throw error
}

export async function updateLotStatus(id: string, status: Lote["estado"]) {
  await requireManager()
  if (status === "cerrado") {
    const { data, error } = await supabase
      .from("controls")
      .select("status,lot_verticals!inner(lot_id)")
      .eq("lot_verticals.lot_id", id)
    if (error) throw error
    if (!data?.length) throw new Error("No se puede cerrar un lote sin controles cargados.")
    if (data.some((control) => !["terminado", "terminada"].includes(control.status))) {
      throw new Error("No se puede cerrar el lote hasta que todos sus controles estén terminados.")
    }
  }
  const { error } = await supabase.from("lots").update({ status }).eq("id", id)
  if (error) throw error
}

export async function addLotAuditor(lotId: string, auditorId: string) {
  await requireManager()
  await requireOpenLot(lotId)
  const { error } = await supabase
    .from("lot_auditors")
    .upsert({ lot_id: lotId, auditor_id: auditorId }, { onConflict: "lot_id,auditor_id" })
  if (error) throw error
}

async function resolveLotVertical(input: CreateControlInput) {
  if (!input.lotVerticalId.startsWith("lv-new-")) return input.lotVerticalId
  if (!input.lotId || !input.verticalId) {
    throw new Error("No se pudo vincular el control con la vertical del lote.")
  }
  const { data, error } = await supabase
    .from("lot_verticals")
    .upsert(
      { lot_id: input.lotId, vertical_id: input.verticalId },
      { onConflict: "lot_id,vertical_id" },
    )
    .select("id")
    .single()
  if (error) throw error
  return data.id as string
}

function controlPayload(input: Omit<CreateControlInput, "lotVerticalId" | "lotId" | "verticalId">) {
  return {
    identifier: input.identifier.trim(),
    tag: input.tag ?? null,
    catalog_item_id: input.catalogItemId || null,
    corresponds_to_process: input.correspondsToProcess,
    process: input.process?.trim() || null,
    subprocess: input.subprocesses?.length ? input.subprocesses.join(", ") : null,
    subprocesses: input.subprocesses ?? [],
    product: input.tag === "Producto" ? input.identifier.trim() : null,
    linked_products: input.linkedProducts ?? [],
    auditor_id: input.auditorId || null,
  }
}

export async function createControl(input: CreateControlInput) {
  if (input.lotId) await requireOpenLot(input.lotId)
  const lotVerticalId = await resolveLotVertical(input)
  const { error } = await supabase.from("controls").insert({
    lot_vertical_id: lotVerticalId,
    status: "pendiente",
    ...controlPayload(input),
  })
  if (error) throw error
}

export async function updateControl(input: Omit<CreateControlInput, "lotVerticalId" | "lotId" | "verticalId"> & { id: string }) {
  const { id, ...values } = input
  await requireOpenLotForControl(id)
  const { error } = await supabase.from("controls").update(controlPayload(values)).eq("id", id)
  if (error) throw error
}

export async function deleteControl(id: string) {
  await requireOpenLotForControl(id)
  const { error } = await supabase.from("controls").delete().eq("id", id)
  if (error) throw error
}

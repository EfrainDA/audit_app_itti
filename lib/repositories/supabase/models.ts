// Persistencia de modelos de control y su estructura jerárquica.
import type { ModeloControl } from "@/lib/data"
import type { ControlModelInput } from "@/features/models/domain/model-input"
import { supabase } from "@/lib/supabase"
import { requireAdminProfile, requireManager } from "./access"

export type { ControlModelInput } from "@/features/models/domain/model-input"

export async function createControlModel(input: ControlModelInput) {
  await requireManager()
  const { error } = await supabase.rpc("save_control_model", { p_model_id: null, payload: input })
  if (error) throw error
}

export async function updateControlModel(id: string, input: ControlModelInput) {
  await requireManager()
  const { error } = await supabase.rpc("save_control_model", { p_model_id: id, payload: input })
  if (error) throw error
}

export async function updateControlModelStatus(id: string, status: ModeloControl["estado"]) {
  await requireManager()
  const { error } = await supabase.from("control_models").update({
    status,
    valid_until: status === "deprecado" ? new Date().toISOString().slice(0, 10) : null,
  }).eq("id", id)
  if (error) throw error
}

export async function deleteControlModel(id: string) {
  await requireAdminProfile()
  const { count, error: usageError } = await supabase
    .from("lots").select("id", { count: "exact", head: true }).eq("model_id", id)
  if (usageError) throw usageError
  if (count) throw new Error("No se puede eliminar un modelo que ya está asociado a lotes.")
  const { error } = await supabase.from("control_models").delete().eq("id", id)
  if (error) throw error
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

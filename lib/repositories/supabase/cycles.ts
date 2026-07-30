// Ciclos de evaluación. La creación usa una RPC para validar el período dentro
// de la misma transacción que inserta el registro.
import type { Ciclo } from "@/lib/data"
import { getCycleDates, type CycleInput } from "@/features/settings/domain/cycles"
import { supabase } from "@/lib/supabase"
import { requireManager } from "./access"

export async function createCycle(input: CycleInput) {
  await requireManager()
  const dates = getCycleDates(input)
  const { error } = await supabase.rpc("create_cycle", {
    cycle_year: input.year,
    cycle_start_month: input.startMonth,
    cycle_end_month: input.endMonth,
    cycle_start_date: dates.startDate,
    cycle_end_date: dates.endDate,
  })
  if (error) throw error
}

export async function updateCycle(id: string, input: CycleInput) {
  await requireManager()
  const dates = getCycleDates(input)
  const { error } = await supabase
    .from("cycles")
    .update({
      year: input.year,
      start_month: input.startMonth,
      end_month: input.endMonth,
      start_date: dates.startDate,
      end_date: dates.endDate,
    })
    .eq("id", id)
  if (error) throw error
}

export async function updateCycleStatus(id: string, status: NonNullable<Ciclo["estado"]>) {
  await requireManager()
  const { error } = await supabase.from("cycles").update({ status }).eq("id", id)
  if (error) throw error
}

export async function deleteCycle(id: string) {
  await requireManager()
  const { data: linkedLots, error: linkedLotsError } = await supabase
    .from("lots")
    .select("id")
    .eq("cycle_id", id)
    .limit(1)
  if (linkedLotsError) throw linkedLotsError
  if (linkedLots?.length) throw new Error("No se puede eliminar un ciclo vinculado a lotes.")

  const { error } = await supabase.from("cycles").delete().eq("id", id)
  if (error) throw error
}

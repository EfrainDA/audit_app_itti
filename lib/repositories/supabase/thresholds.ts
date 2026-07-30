import { supabase } from "@/lib/supabase"

export type ThresholdUpdate = {
  id: string
  min: number
  max: number
}

export async function persistThresholds(thresholds: ThresholdUpdate[]) {
  for (const threshold of thresholds) {
    const { data, error } = await supabase
      .from("thresholds")
      .update({
        min_value: threshold.min,
        max_value: threshold.max,
      })
      .eq("id", threshold.id)
      .select("id")
      .maybeSingle()

    if (error) throw error
    if (!data) {
      throw new Error("No se pudo actualizar uno de los umbrales. Verifica los permisos de Supervisor o CEO.")
    }
  }
}

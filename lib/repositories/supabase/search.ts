// Índice liviano para la búsqueda global; limita resultados desde la consulta.
import { supabase } from "@/lib/supabase";

const SEARCH_LIMIT = 250

export type SearchIndex = {
  users: Array<{ id: string; name: string; email: string; company: string | null; cargo: string | null; area: string | null; role: string }>
  units: Array<{ id: string; name: string; ecosystem: string }>
  models: Array<{ id: string; name: string; description: string | null; status: string }>
  lots: Array<{ id: string; businessUnitId: string; modelId: string; status: string; year: number; bimester: number }>
  controls: Array<{ id: string; identifier: string; description: string | null; process: string | null; subprocess: string | null; product: string | null; status: string }>
}

export async function fetchSearchIndex(signal: AbortSignal): Promise<SearchIndex> {
  const [users, units, models, lots, controls] = await Promise.all([
    supabase.from("users").select("id,name,email,company,cargo,area,role").order("name").limit(SEARCH_LIMIT).abortSignal(signal),
    supabase.from("business_units").select("id,name,ecosystem").order("name").limit(SEARCH_LIMIT).abortSignal(signal),
    supabase.from("control_models").select("id,name,description,status").order("created_at", { ascending: false }).limit(SEARCH_LIMIT).abortSignal(signal),
    supabase.from("lots").select("id,business_unit_id,model_id,status,cycles(year,bimester)").order("created_at", { ascending: false }).limit(SEARCH_LIMIT).abortSignal(signal),
    supabase.from("controls").select("id,identifier,description,process,subprocess,product,status").order("created_at", { ascending: false }).limit(SEARCH_LIMIT).abortSignal(signal),
  ])

  const error = [users.error, units.error, models.error, lots.error, controls.error].find(Boolean)
  if (error) throw error

  return {
    users: (users.data ?? []) as SearchIndex["users"],
    units: (units.data ?? []) as SearchIndex["units"],
    models: (models.data ?? []) as SearchIndex["models"],
    lots: (lots.data ?? []).map((lot) => {
      const cycleRelation = lot.cycles as { year?: number; bimester?: number } | { year?: number; bimester?: number }[] | null
      const cycle = Array.isArray(cycleRelation) ? cycleRelation[0] : cycleRelation
      return {
        id: lot.id,
        businessUnitId: lot.business_unit_id,
        modelId: lot.model_id,
        status: lot.status,
        year: cycle?.year ?? 0,
        bimester: cycle?.bimester ?? 0,
      }
    }),
    controls: (controls.data ?? []) as SearchIndex["controls"],
  }
}

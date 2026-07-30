import { supabase } from "@/lib/supabase"

export type ExecutiveDashboard = {
  totals: {
    controls: number
    completed: number
    average_score: number | null
    cumple: number
    intermedio: number
    no_cumple: number
    na: number
  }
  byBusinessUnit: Array<{
    businessUnitId: string
    controls: number
    completed: number
    averageScore: number | null
  }>
  byVertical: Array<{
    verticalId: string
    controls: number
    completed: number
    averageScore: number | null
  }>
}

export async function fetchExecutiveDashboard(filters: {
  cycleId?: string
  ecosystem?: string
} = {}): Promise<ExecutiveDashboard> {
  const { data, error } = await supabase.rpc("get_executive_dashboard", {
    p_cycle_id: filters.cycleId ?? null,
    p_ecosystem: filters.ecosystem ?? null,
  })
  if (error) throw error
  return data as ExecutiveDashboard
}

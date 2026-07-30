"use client"

import useSWR from "swr"
import {
  fetchExecutiveDashboard,
  type ExecutiveDashboard,
} from "@/lib/repositories/supabase/dashboard"

export function useExecutiveDashboard(input: {
  cycleId?: string
  ecosystem?: string
  enabled?: boolean
}) {
  const enabled = input.enabled ?? true
  const key = enabled
    ? ["executive-dashboard", input.cycleId ?? "all", input.ecosystem ?? "all"] as const
    : null
  const query = useSWR(
    key,
    () => fetchExecutiveDashboard({
      cycleId: input.cycleId,
      ecosystem: input.ecosystem,
    }),
    {
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  )

  return {
    data: query.data as ExecutiveDashboard | undefined,
    error: query.error as Error | undefined,
    isLoading: Boolean(key) && query.isLoading,
  }
}

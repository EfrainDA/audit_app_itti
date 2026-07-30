"use client"

import { fetchSearchIndex, type SearchIndex } from "@/lib/repositories/supabase/search"
import useSWR from "swr"

const emptySearchIndex: SearchIndex = {
  users: [],
  units: [],
  models: [],
  lots: [],
  controls: [],
}

export function useSearchIndex(enabled: boolean) {
  const query = useSWR(
    enabled ? ["global-search"] : null,
    async () => {
      const controller = new AbortController()
      return fetchSearchIndex(controller.signal)
    },
    {
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
    },
  )

  return { data: query.data ?? emptySearchIndex, isLoading: query.isLoading }
}

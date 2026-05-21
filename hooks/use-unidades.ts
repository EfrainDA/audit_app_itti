"use client"

import { useAppData } from "@/hooks/use-app-data"

export function useUnidades() {
  const { data, refresh } = useAppData()

  return {
    unidades: data.unidades,
    refreshUnidades: refresh,
  }
}

"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchAppData, type AppData } from "@/lib/supabase-data"
import { getErrorMessage } from "@/lib/error-message"

const emptyData: AppData = {
  users: [],
  unidades: [],
  ciclos: [],
  umbrales: [],
  modelos: [],
  lotes: [],
  loteVerticales: [],
  auditorias: [],
  notificaciones: [],
}

export function useAppData() {
  const [data, setData] = useState<AppData>(emptyData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabaseData = await fetchAppData()
      setData(supabaseData)
    } catch (loadError) {
      setError(getErrorMessage(loadError, "No se pudieron cargar los datos de Supabase."))
      setData(emptyData)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, isLoading, source: "supabase" as const, error, refresh }
}

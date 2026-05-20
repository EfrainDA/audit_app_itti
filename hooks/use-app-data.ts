"use client"

import { useEffect, useState } from "react"
import {
  mockAuditorias,
  mockCiclos,
  mockLoteVerticales,
  mockLotes,
  mockModelos,
  mockNotificaciones,
  mockUmbrales,
  mockUnidades,
  mockUsers,
} from "@/lib/data"
import { fetchAppData, type AppData } from "@/lib/supabase-data"

const fallbackData: AppData = {
  users: mockUsers,
  unidades: mockUnidades,
  ciclos: mockCiclos,
  umbrales: mockUmbrales,
  modelos: mockModelos,
  lotes: mockLotes,
  loteVerticales: mockLoteVerticales,
  auditorias: mockAuditorias,
  notificaciones: mockNotificaciones,
}

function hasSupabaseData(data: AppData) {
  return (
    data.users.length > 0 ||
    data.unidades.length > 0 ||
    data.modelos.length > 0 ||
    data.lotes.length > 0 ||
    data.loteVerticales.length > 0
  )
}

export function useAppData() {
  const [data, setData] = useState<AppData>(fallbackData)
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState<"supabase" | "mock">("mock")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const supabaseData = await fetchAppData()
        if (!isMounted) return

        if (hasSupabaseData(supabaseData)) {
          setData({
            users: supabaseData.users.length ? supabaseData.users : fallbackData.users,
            unidades: supabaseData.unidades.length ? supabaseData.unidades : fallbackData.unidades,
            ciclos: supabaseData.ciclos.length ? supabaseData.ciclos : fallbackData.ciclos,
            umbrales: supabaseData.umbrales.length ? supabaseData.umbrales : fallbackData.umbrales,
            modelos: supabaseData.modelos.length ? supabaseData.modelos : fallbackData.modelos,
            lotes: supabaseData.lotes.length ? supabaseData.lotes : fallbackData.lotes,
            loteVerticales: supabaseData.loteVerticales.length ? supabaseData.loteVerticales : fallbackData.loteVerticales,
            auditorias: supabaseData.auditorias.length ? supabaseData.auditorias : fallbackData.auditorias,
            notificaciones: supabaseData.notificaciones.length ? supabaseData.notificaciones : fallbackData.notificaciones,
          })
          setSource("supabase")
        } else {
          setData(fallbackData)
          setSource("mock")
        }
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los datos de Supabase.")
        setData(fallbackData)
        setSource("mock")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  return { data, isLoading, source, error }
}

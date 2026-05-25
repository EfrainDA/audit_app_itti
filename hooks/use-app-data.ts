"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchAppData, type AppData } from "@/lib/supabase-data"
import { getErrorMessage } from "@/lib/error-message"
import { useAuth } from "@/components/auth/auth-provider"

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

type AppDataState = {
  data: AppData
  isLoading: boolean
  error: string | null
  hasLoaded: boolean
}

const CACHE_TTL_MS = 60_000

let cachedState: AppDataState = {
  data: emptyData,
  isLoading: false,
  error: null,
  hasLoaded: false,
}
let lastLoadedAt = 0
let cacheUserId: string | null = null
let inFlightRequest: Promise<void> | null = null
const listeners = new Set<(state: AppDataState) => void>()

function notify() {
  listeners.forEach((listener) => listener(cachedState))
}

function setCachedState(nextState: Partial<AppDataState>) {
  cachedState = { ...cachedState, ...nextState }
  notify()
}

async function loadAppData(profile?: Parameters<typeof fetchAppData>[0], force = false) {
  const profileId = profile?.id ?? null
  if (cacheUserId !== profileId) {
    cacheUserId = profileId
    lastLoadedAt = 0
    cachedState = {
      data: emptyData,
      isLoading: false,
      error: null,
      hasLoaded: false,
    }
    notify()
  }

  const isCacheFresh = cachedState.hasLoaded && Date.now() - lastLoadedAt < CACHE_TTL_MS

  if (!force && isCacheFresh) return
  if (inFlightRequest) return inFlightRequest

  setCachedState({
    isLoading: !cachedState.hasLoaded,
    error: null,
  })

  inFlightRequest = fetchAppData(profile)
    .then((supabaseData) => {
      lastLoadedAt = Date.now()
      setCachedState({
        data: supabaseData,
        isLoading: false,
        error: null,
        hasLoaded: true,
      })
    })
    .catch((loadError) => {
      setCachedState({
        data: cachedState.hasLoaded ? cachedState.data : emptyData,
        isLoading: false,
        error: getErrorMessage(loadError, "No se pudieron cargar los datos de Supabase."),
        hasLoaded: cachedState.hasLoaded,
      })
    })
    .finally(() => {
      inFlightRequest = null
    })

  return inFlightRequest
}

export function useAppData() {
  const { appUser } = useAuth()
  const [state, setState] = useState<AppDataState>(() => ({
    ...cachedState,
    isLoading: cachedState.isLoading || !cachedState.hasLoaded,
  }))

  const refresh = useCallback(async () => {
    await loadAppData(appUser ? { id: appUser.id, role: appUser.role, status: appUser.status } : undefined, true)
  }, [appUser])

  useEffect(() => {
    listeners.add(setState)
    void loadAppData(appUser ? { id: appUser.id, role: appUser.role, status: appUser.status } : undefined)

    return () => {
      listeners.delete(setState)
    }
  }, [appUser])

  return { data: state.data, isLoading: state.isLoading, source: "supabase" as const, error: state.error, refresh }
}

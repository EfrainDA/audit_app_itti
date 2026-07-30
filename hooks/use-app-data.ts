"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { getAppDataScopeKey } from "@/lib/domain/app-data-scope"
import {
  fetchAppData,
  type AppData,
  type AppDataDomain,
  type AppDataScope,
} from "@/lib/repositories/supabase/app-data"
import { useEffect, useMemo, useRef } from "react"
import useSWR from "swr"

const emptyData: AppData = {
  users: [],
  unidades: [],
  ciclos: [],
  umbrales: [],
  catalogItems: [],
  modelos: [],
  lotes: [],
  loteVerticales: [],
  auditorias: [],
  respuestas: [],
  answeredControlIds: [],
  notificaciones: [],
}

const ALL_DOMAINS: AppDataDomain[] = ["users", "settings", "models", "planning", "evaluations"]

type UseAppDataOptions = {
  domains?: AppDataDomain[]
  enabled?: boolean
  scope?: AppDataScope
}

// Caché por usuario y conjunto de dominios. SWR deduplica consumidores con la
// misma clave y cada feature solo se re-renderiza cuando cambia su propia consulta.
export function useAppData(options: UseAppDataOptions = {}) {
  const { appUser } = useAuth()
  const enabled = options.enabled ?? true
  const domainsKey = useMemo(
    () => [...new Set(options.domains ?? ALL_DOMAINS)].sort().join(","),
    [options.domains],
  )
  const controllerRef = useRef<AbortController | null>(null)
  const generationRef = useRef(0)
  const lifecycleRef = useRef(0)
  const profile = appUser
    ? { id: appUser.id, role: appUser.role, status: appUser.status }
    : null
  const scopeKey = getAppDataScopeKey(options.scope)
  const key = enabled && profile ? ["app-data", profile.id, domainsKey, scopeKey] as const : null

  const query = useSWR(
    key,
    async ([, requestedUserId, requestedDomains]) => {
      const generation = ++generationRef.current
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      if (!profile || profile.id !== requestedUserId) {
        throw new DOMException("La sesión cambió durante la carga.", "AbortError")
      }

      const result = await fetchAppData(
        profile,
        controller.signal,
        requestedDomains.split(",").filter(Boolean) as AppDataDomain[],
        options.scope,
      )
      if (generation !== generationRef.current || controller.signal.aborted) {
        throw new DOMException("Respuesta obsoleta descartada.", "AbortError")
      }
      return result
    },
    {
      dedupingInterval: 60_000,
      keepPreviousData: false,
      revalidateOnFocus: false,
      shouldRetryOnError: (error) => error?.name !== "AbortError",
    },
  )

  useEffect(() => {
    const lifecycle = ++lifecycleRef.current

    return () => {
      // React Strict Mode ejecuta setup -> cleanup -> setup al montar en
      // desarrollo. Esperar un microtask permite que el segundo setup invalide
      // esta limpieza; un desmontaje real conserva el mismo identificador.
      queueMicrotask(() => {
        // Se lee el valor actual deliberadamente para distinguir el segundo setup.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        if (lifecycleRef.current !== lifecycle) return
        generationRef.current += 1
        controllerRef.current?.abort()
      })
    }
  }, [profile?.id, domainsKey, scopeKey])

  return {
    data: query.data ?? emptyData,
    isLoading: Boolean(key) && query.isLoading,
    source: "supabase" as const,
    error: query.error?.name === "AbortError" ? null : query.error?.message ?? null,
    refresh: async () => {
      await query.mutate()
    },
  }
}

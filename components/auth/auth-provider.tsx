"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { Session, User as SupabaseUser } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import type { User } from "@/lib/data"

type AuthContextValue = {
  session: Session | null
  authUser: SupabaseUser | null
  appUser: User | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

// Contexto global que expone la sesión y el perfil a toda la aplicación.
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Configuración del cierre de sesión cuando la pestaña permanece inactiva.
const TAB_AWAY_TIMEOUT_MS = 60 * 60 * 1000
const TAB_AWAY_STARTED_AT_KEY = "audit_app_tab_away_started_at"

// Convierte el perfil recibido desde la base de datos al modelo usado por la UI.
function mapProfile(row: {
  id: string
  name: string
  email: string
  role: User["role"]
  status: User["status"]
  avatar: string | null
  company: string | null
  cargo: string | null
  area: string | null
}): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    avatar: row.avatar ?? undefined,
    company: row.company ?? undefined,
    cargo: row.cargo ?? undefined,
    area: row.area ?? undefined,
  }
}

// Valida la sesión actual y obtiene o crea el perfil de la aplicación.
async function ensureProfile(authUser: SupabaseUser, signal: AbortSignal): Promise<User | null> {
  const { data } = await supabase.auth.getSession()
  const currentSession = data.session
  if (!currentSession?.access_token) throw new Error("No se encontró una sesión válida.")
  if (currentSession.user.id !== authUser.id) throw new Error("La sesión cambió mientras se cargaba el perfil.")

  const response = await fetch("/api/auth/profile", {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  })
  const body = (await response.json().catch(() => null)) as { profile?: Parameters<typeof mapProfile>[0]; error?: string } | null

  if (!response.ok || !body?.profile) {
    await supabase.auth.signOut()
    throw new Error(body?.error ?? "No se pudo cargar el perfil del usuario.")
  }

  return mapProfile(body.profile)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Estado central de autenticación.
  const [session, setSession] = useState<Session | null>(null)
  const [appUser, setAppUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const profileGenerationRef = useRef(0)
  const profileAbortRef = useRef<AbortController | null>(null)

  // Cierra la sesión tanto en Supabase como en el estado local.
  const signOut = useCallback(async () => {
    profileGenerationRef.current += 1
    profileAbortRef.current?.abort()
    window.sessionStorage.removeItem(TAB_AWAY_STARTED_AT_KEY)
    await supabase.auth.signOut()
    setSession(null)
    setAppUser(null)
  }, [])

  // Vuelve a consultar la sesión y actualiza el perfil visible en la aplicación.
  const refreshProfile = async () => {
    const generation = ++profileGenerationRef.current
    profileAbortRef.current?.abort()
    const controller = new AbortController()
    profileAbortRef.current = controller
    const { data } = await supabase.auth.getSession()
    const currentSession = data.session
    if (generation !== profileGenerationRef.current || controller.signal.aborted) return
    setSession(currentSession)

    if (!currentSession?.user) {
      setAppUser(null)
      return
    }

    const profile = await ensureProfile(currentSession.user, controller.signal)
    if (generation === profileGenerationRef.current && !controller.signal.aborted) setAppUser(profile)
  }

  // Carga la sesión guardada al iniciar la aplicación y escucha cambios de Supabase.
  useEffect(() => {
    let isMounted = true

    async function hydrateSession() {
      const generation = ++profileGenerationRef.current
      profileAbortRef.current?.abort()
      const controller = new AbortController()
      profileAbortRef.current = controller
      try {
        const { data } = await supabase.auth.getSession()
        if (!isMounted || generation !== profileGenerationRef.current || controller.signal.aborted) return

        setSession(data.session)
        if (data.session?.user) {
          const profile = await ensureProfile(data.session.user, controller.signal)
          if (isMounted && generation === profileGenerationRef.current && !controller.signal.aborted) setAppUser(profile)
        }
      } catch {
        if (isMounted) {
          setSession(null)
          setAppUser(null)
        }
      } finally {
        if (isMounted && generation === profileGenerationRef.current) setIsLoading(false)
      }
    }

    hydrateSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const generation = ++profileGenerationRef.current
      profileAbortRef.current?.abort()
      const controller = new AbortController()
      profileAbortRef.current = controller
      setSession(nextSession)
      setAppUser(null)

      if (!nextSession?.user) {
        setAppUser(null)
        setIsLoading(false)
        return
      }

      ensureProfile(nextSession.user, controller.signal)
        .then((profile) => {
          if (isMounted && generation === profileGenerationRef.current && !controller.signal.aborted) setAppUser(profile)
        })
        .catch(() => {
          if (isMounted && generation === profileGenerationRef.current && !controller.signal.aborted) {
            setSession(null)
            setAppUser(null)
          }
        })
        .finally(() => {
          if (isMounted && generation === profileGenerationRef.current) setIsLoading(false)
        })
    })

    return () => {
      isMounted = false
      profileGenerationRef.current += 1
      profileAbortRef.current?.abort()
      listener.subscription.unsubscribe()
    }
  }, [])

  // Controla el cierre de sesión cuando la pestaña pierde el foco durante una hora.
  useEffect(() => {
    if (!session) {
      window.sessionStorage.removeItem(TAB_AWAY_STARTED_AT_KEY)
      return
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const clearAwayTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const getAwayStartedAt = () => {
      const value = window.sessionStorage.getItem(TAB_AWAY_STARTED_AT_KEY)
      const timestamp = Number(value)
      return Number.isFinite(timestamp) ? timestamp : null
    }

    const checkAwayTimeout = async () => {
      const startedAt = getAwayStartedAt()
      if (!startedAt) return

      const elapsed = Date.now() - startedAt
      if (elapsed >= TAB_AWAY_TIMEOUT_MS) {
        clearAwayTimer()
        await signOut()
      }
    }

    const startAwayTimer = () => {
      if (getAwayStartedAt() === null) {
        window.sessionStorage.setItem(TAB_AWAY_STARTED_AT_KEY, String(Date.now()))
      }

      clearAwayTimer()
      const startedAt = getAwayStartedAt()
      const remaining = Math.max(TAB_AWAY_TIMEOUT_MS - (Date.now() - (startedAt ?? Date.now())), 0)
      timeoutId = setTimeout(() => {
        checkAwayTimeout()
      }, remaining)
    }

    const markActive = () => {
      checkAwayTimeout()
      if (document.visibilityState === "visible" && document.hasFocus()) {
        window.sessionStorage.removeItem(TAB_AWAY_STARTED_AT_KEY)
        clearAwayTimer()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        startAwayTimer()
        return
      }

      markActive()
    }

    const handleFocus = () => markActive()
    const handleBlur = () => startAwayTimer()

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)

    if (document.visibilityState === "hidden" || !document.hasFocus()) {
      startAwayTimer()
    }

    return () => {
      clearAwayTimer()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("blur", handleBlur)
    }
  }, [session, signOut])

  // Memoriza el valor del contexto para evitar renders innecesarios de sus consumidores.
  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      authUser: session?.user ?? null,
      appUser,
      isLoading,
      refreshProfile,
      signOut,
    }),
    [appUser, isLoading, session, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook de acceso al contexto con una validación de uso dentro de AuthProvider.
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return context
}

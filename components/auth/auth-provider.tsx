"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
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

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const TAB_AWAY_TIMEOUT_MS = 60 * 60 * 1000
const TAB_AWAY_STARTED_AT_KEY = "audit_app_tab_away_started_at"

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

async function ensureProfile(authUser: SupabaseUser): Promise<User | null> {
  const { data } = await supabase.auth.getSession()
  const currentSession = data.session
  if (!currentSession?.access_token) throw new Error("No se encontro una sesion valida.")
  if (currentSession.user.id !== authUser.id) throw new Error("La sesion cambio mientras se cargaba el perfil.")

  const response = await fetch("/api/auth/profile", {
    method: "POST",
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
  const [session, setSession] = useState<Session | null>(null)
  const [appUser, setAppUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const signOut = useCallback(async () => {
    window.sessionStorage.removeItem(TAB_AWAY_STARTED_AT_KEY)
    await supabase.auth.signOut()
    setSession(null)
    setAppUser(null)
  }, [])

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession()
    const currentSession = data.session
    setSession(currentSession)

    if (!currentSession?.user) {
      setAppUser(null)
      return
    }

    const profile = await ensureProfile(currentSession.user)
    setAppUser(profile)
  }

  useEffect(() => {
    let isMounted = true

    async function hydrateSession() {
      try {
        const { data } = await supabase.auth.getSession()
        if (!isMounted) return

        setSession(data.session)
        if (data.session?.user) {
          const profile = await ensureProfile(data.session.user)
          if (isMounted) setAppUser(profile)
        }
      } catch {
        if (isMounted) {
          setSession(null)
          setAppUser(null)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    hydrateSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)

      if (!nextSession?.user) {
        setAppUser(null)
        setIsLoading(false)
        return
      }

      ensureProfile(nextSession.user)
        .then((profile) => {
          if (isMounted) setAppUser(profile)
        })
        .catch(() => {
          if (isMounted) {
            setSession(null)
            setAppUser(null)
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false)
        })
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

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

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return context
}

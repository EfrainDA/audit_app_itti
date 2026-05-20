"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
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

function mapProfile(row: {
  id: string
  name: string
  email: string
  role: User["role"]
  status: User["status"]
  avatar: string | null
}): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    avatar: row.avatar ?? undefined,
  }
}

async function ensureProfile(authUser: SupabaseUser): Promise<User | null> {
  const email = authUser.email ?? ""
  const displayName =
    authUser.user_metadata?.name ||
    authUser.user_metadata?.full_name ||
    email.split("@")[0] ||
    "Usuario"

  const { data: existingByAuthId, error: authIdError } = await supabase
    .from("users")
    .select("id,name,email,role,status,avatar")
    .eq("auth_user_id", authUser.id)
    .maybeSingle()

  if (authIdError) throw authIdError
  if (existingByAuthId) return mapProfile(existingByAuthId)

  const { data: existingByEmail, error: emailError } = await supabase
    .from("users")
    .select("id,name,email,role,status,avatar")
    .eq("email", email)
    .maybeSingle()

  if (emailError) throw emailError

  if (existingByEmail) {
    const { data: linkedProfile, error: updateError } = await supabase
      .from("users")
      .update({ auth_user_id: authUser.id })
      .eq("id", existingByEmail.id)
      .select("id,name,email,role,status,avatar")
      .single()

    if (updateError) throw updateError
    return mapProfile(linkedProfile)
  }

  const { data: createdProfile, error: insertError } = await supabase
    .from("users")
    .insert({
      auth_user_id: authUser.id,
      name: displayName,
      email,
      role: "auditor",
      status: "activo",
    })
    .select("id,name,email,role,status,avatar")
    .single()

  if (insertError) throw insertError
  return mapProfile(createdProfile)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [appUser, setAppUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
        .finally(() => {
          if (isMounted) setIsLoading(false)
        })
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      authUser: session?.user ?? null,
      appUser,
      isLoading,
      refreshProfile,
      signOut: async () => {
        await supabase.auth.signOut()
        setSession(null)
        setAppUser(null)
      },
    }),
    [appUser, isLoading, session],
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

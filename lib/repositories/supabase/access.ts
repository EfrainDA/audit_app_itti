// Guardas reutilizables para impedir escrituras desde perfiles inactivos o
// roles insuficientes antes de que RLS vuelva a validar en PostgreSQL.
import type { AppRole } from "@/lib/domain/permissions"
import { supabase } from "@/lib/supabase"

type ActiveProfile = {
  id: string
  role: AppRole
  status: "activo"
}

export async function requireActiveProfile(): Promise<ActiveProfile> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) throw new Error("Debes iniciar sesión para guardar datos.")

  const { data, error } = await supabase
    .from("users")
    .select("id,role,status")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle()

  if (error) throw error
  if (!data || data.status !== "activo") {
    throw new Error("Tu perfil no está activo.")
  }

  return data as ActiveProfile
}

export async function requireManager() {
  const profile = await requireActiveProfile()
  if (profile.role !== "admin" && profile.role !== "supervisor") {
    throw new Error("Solo un supervisor o administrador puede realizar esta acción.")
  }
  return profile
}

export async function requireAdminProfile() {
  const profile = await requireActiveProfile()
  if (profile.role !== "admin") throw new Error("Solo un administrador puede realizar esta acción.")
  return profile
}

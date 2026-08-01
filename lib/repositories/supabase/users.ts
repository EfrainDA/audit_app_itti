// Operaciones de perfiles. Las contraseñas administradas pasan por una ruta de
// servidor; el cliente nunca recibe la clave privilegiada de Supabase Auth.
import type { User } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { requireActiveProfile, requireAdminProfile } from "./access";

export async function updateUserProfile(
  id: string,
  input: { name?: string; role?: User["role"]; status?: User["status"]; cargo?: string; area?: string },
) {
  await requireAdminProfile()
  const payload = {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.role !== undefined ? { role: input.role } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.cargo !== undefined ? { cargo: input.cargo.trim() || null } : {}),
    ...(input.area !== undefined ? { area: input.area.trim() || null } : {}),
  }
  const { error } = await supabase.from("users").update(payload).eq("id", id)
  if (error) throw error
}

export async function assignUserPassword(id: string, password: string) {
  await requireAdminProfile()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error("No se encontró una sesión válida.")

  const response = await fetch(`/api/users/${id}/password`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  })
  const result = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok) throw new Error(result?.error || "No se pudo asignar la contraseña.")
}

export async function updateOwnProfile(input: {
  name: string
  company?: string
  cargo?: string
  area?: string
  avatar?: string | null
}) {
  const profile = await requireActiveProfile()
  const { error } = await supabase
    .from("users")
    .update({
      name: input.name.trim(),
      company: input.company?.trim() || null,
      cargo: input.cargo?.trim() || null,
      area: input.area?.trim() || null,
      avatar: input.avatar || null,
    })
    .eq("id", profile.id)
  if (error) throw error
}

export async function createUserProfile(input: {
  name: string
  email: string
  role: User["role"]
  company?: string
  cargo?: string
  area?: string
}) {
  await requireAdminProfile()
  const { data, error } = await supabase.from("users").insert({
    name: input.name.trim(),
    email: input.email.trim(),
    company: input.company?.trim() || null,
    cargo: input.cargo?.trim() || null,
    area: input.area?.trim() || null,
    role: input.role,
    status: "activo",
  }).select("id").single<{ id: string }>()
  if (error) throw error
  return data
}

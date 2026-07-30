import { supabase } from "@/lib/supabase"

export async function changeOwnPassword(input: {
  email: string
  currentPassword: string
  newPassword: string
}) {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.currentPassword,
  })
  if (signInError) throw new Error("La contraseña actual no es correcta.")

  const { error } = await supabase.auth.updateUser({ password: input.newPassword })
  if (error) throw error
}

"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { validatePassword } from "@/lib/domain/password-policy"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

export function PasswordChangeForm({ recovery = false }: { recovery?: boolean }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(null)
    if (!validatePassword(password).valid) return setError("Debe tener entre 12 y 128 caracteres, mayúsculas, minúsculas y números.")
    if (password !== confirmation) return setError("Las contraseñas no coinciden.")
    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      const { data } = await supabase.auth.getSession()
      if (data.session?.user.app_metadata?.must_change_password === true) {
        const response = await fetch("/api/auth/password-complete", { method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}` } })
        if (!response.ok) throw new Error("La contraseña cambió, pero no se pudo completar el acceso. Intenta nuevamente.")
        await supabase.auth.refreshSession()
      }
      if (recovery) await supabase.auth.signOut()
      router.replace(recovery ? "/login?passwordChanged=true" : "/")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cambiar la contraseña.") }
    finally { setSaving(false) }
  }
  return <form onSubmit={submit} className="space-y-4"><div><Label htmlFor="new-password">Nueva contraseña</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div><div><Label htmlFor="confirm-password">Confirmar contraseña</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>{error && <p role="alert" className="text-sm text-status-danger-text">{error}</p>}<Button className="w-full" disabled={saving}>{saving ? "Actualizando..." : "Cambiar contraseña"}</Button></form>
}

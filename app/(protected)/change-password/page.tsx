import { PasswordChangeForm } from "@/components/auth/password-change-form"

export default function ChangePasswordPage() {
  return <section className="mx-auto max-w-md rounded-xl border bg-card p-6 shadow-sm"><h1 className="text-xl font-semibold">Cambia tu contraseña temporal</h1><p className="mb-5 mt-2 text-sm text-muted-foreground">Por seguridad, debes crear una contraseña personal antes de continuar.</p><PasswordChangeForm /></section>
}

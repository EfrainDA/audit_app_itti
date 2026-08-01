import { PasswordChangeForm } from "@/components/auth/password-change-form"

export default function ResetPasswordPage() {
  return <main className="flex min-h-dvh items-center justify-center bg-background px-4"><section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm"><h1 className="text-xl font-semibold">Recuperar contraseña</h1><p className="mb-5 mt-2 text-sm text-muted-foreground">Ingresa una nueva contraseña para tu cuenta.</p><PasswordChangeForm recovery /></section></main>
}

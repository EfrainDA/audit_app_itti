"use client"

import { FormEvent, Suspense, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Building2, ClipboardCheck, Eye, EyeOff, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"

type AuthMode = "login" | "register"
const LOGIN_DESTINATION = "/"
const ALLOW_PUBLIC_SIGNUP = process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP === "true"

// Gestiona acceso, registro opcional y redirección mediante Supabase Auth.
function LoginContent() {
  const router = useRouter()
  const { session, refreshProfile } = useAuth()
  const [mode, setMode] = useState<AuthMode>("login")
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      router.replace(LOGIN_DESTINATION)
    }
  }, [router, session])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError
        await refreshProfile()
        router.replace(LOGIN_DESTINATION)
        return
      }

      if (!ALLOW_PUBLIC_SIGNUP) {
        throw new Error("El registro público está deshabilitado. Solicita acceso al administrador.")
      }

      const cleanName = name.trim()
      const cleanCompany = company.trim()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: cleanName || email.split("@")[0],
            company: cleanCompany,
            empresa: cleanCompany,
          },
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
        },
      })

      if (signUpError) throw signUpError

      if (data.session) {
        await refreshProfile()
        router.replace(LOGIN_DESTINATION)
      } else {
        setMessage("Revisa tu correo para confirmar la cuenta y luego inicia sesi\u00f3n.")
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "No se pudo completar la autenticaci\u00f3n.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleAccess = async () => {
    setError(null)
    setMessage(null)
    setIsGoogleSubmitting(true)

    try {
      const { data, error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}${LOGIN_DESTINATION}` : undefined,
        },
      })

      if (googleError) throw googleError
      if (data?.url && typeof window !== "undefined") {
        window.location.href = data.url
      }
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : "No se pudo iniciar sesión con Gmail.")
    } finally {
      if (typeof window !== "undefined") {
        setIsGoogleSubmitting(false)
      }
    }
  }

  const handlePasswordReset = async () => {
    setError(null)
    setMessage(null)

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError("Ingresa tu correo para enviarte el enlace de recuperación.")
      return
    }

    setIsResettingPassword(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      })

      if (resetError) throw resetError
      setMessage("Te enviamos un enlace para recuperar tu contraseña.")
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "No se pudo enviar el enlace de recuperación.")
    } finally {
      setIsResettingPassword(false)
    }
  }

  const toggleMode = (nextMode: AuthMode) => {
    if (nextMode === "register" && !ALLOW_PUBLIC_SIGNUP) {
      setError("El registro público está deshabilitado. Solicita acceso al administrador.")
      return
    }

    setMode(nextMode)
    setError(null)
    setMessage(null)
    setShowPassword(false)
  }

  return (
    <main className="login-light flex h-dvh items-center justify-center overflow-hidden bg-[#f6f8fb] text-slate-950">
      <section className="grid h-full w-full overflow-hidden bg-white lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
        <div className="flex min-h-0 items-center justify-center px-7 py-8 sm:px-10 lg:px-16 xl:px-24">
          <div className="w-full max-w-[420px]">
            <div className="mb-14 flex justify-start [@media(max-height:740px)]:mb-8">
              <Image
                src="/logo2.png"
                alt="Qualittyx"
                width={280}
                height={92}
                className="h-auto w-[190px] object-contain [@media(max-height:740px)]:w-[165px]"
                priority
              />
            </div>

            <div className="mb-8 [@media(max-height:740px)]:mb-5">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 [@media(max-height:740px)]:text-2xl">
                {mode === "login" ? "Iniciar Sesi\u00f3n" : "Crear cuenta"}
              </h1>
              <p className="mt-4 text-base text-slate-500 [@media(max-height:740px)]:mt-2 [@media(max-height:740px)]:text-sm">
                {mode === "login" ? "¡Bienvenido de nuevo!" : "Completa tus datos para habilitar el acceso."}
              </p>
            </div>

            <form className="space-y-5 [@media(max-height:740px)]:space-y-3.5" onSubmit={handleSubmit}>
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nombre y Apellido</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ej. Ana Farina"
                      autoComplete="name"
                      required
                      className="h-12 rounded-md border-slate-200 bg-white pl-10"
                    />
                  </div>
                </div>
              )}

              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="company">Empresa a la que pertenece</Label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="company"
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      placeholder="Ej. itti"
                      autoComplete="organization"
                      required
                      className="h-12 rounded-md border-slate-200 bg-white pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Correo</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Ingresa tu correo"
                    autoComplete="email"
                    required
                    className="h-12 rounded-md border-slate-200 bg-white pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === "login" ? "Contrase\u00f1a" : "M\u00ednimo 12 caracteres"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={mode === "login" ? 6 : 12}
                    required
                    className="h-12 rounded-md border-slate-200 bg-white pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1.5 h-9 w-9 text-muted-foreground"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {mode === "login" && (
                  <div className="flex justify-end [@media(max-height:700px)]:-mt-0.5">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto px-0 py-0 text-xs font-semibold"
                      disabled={isResettingPassword}
                      onClick={handlePasswordReset}
                    >
                      {isResettingPassword ? "Enviando..." : "Olvidaste tu contrase\u00f1a?"}
                    </Button>
                  </div>
                )}
              </div>

              {error && (
                <p className="rounded-lg border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text">
                  {error}
                </p>
              )}
              {message && (
                <p className="rounded-lg border border-status-success-border bg-status-success-surface px-3 py-2 text-sm text-status-success-text">
                  {message}
                </p>
              )}

              <div className="grid gap-3 pt-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Button type="submit" className="h-11 w-full rounded-md" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {mode === "login" ? "Iniciar Sesi\u00f3n" : "Crear Cuenta"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-md bg-white text-slate-700 hover:bg-slate-50"
                  disabled={isGoogleSubmitting || isSubmitting}
                  onClick={handleGoogleAccess}
                >
                  {isGoogleSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
                      />
                    </svg>
                  )}
                  Gmail
                </Button>
              </div>

              {ALLOW_PUBLIC_SIGNUP && (
                <p className="text-center text-sm text-slate-500 [@media(max-height:740px)]:text-xs">
                  {mode === "login" ? "¿No tienes una cuenta?" : "¿Ya tienes una cuenta?"}{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                    onClick={() => toggleMode(mode === "login" ? "register" : "login")}
                  >
                    {mode === "login" ? "Registrate aquí" : "Ingresa aquí"}
                  </button>
                </p>
              )}
            </form>
          </div>
        </div>

        <aside className="relative hidden min-h-0 overflow-hidden bg-[radial-gradient(circle_at_30%_20%,rgba(55,210,255,0.34),transparent_28%),linear-gradient(135deg,#071733_0%,#0b2f58_48%,#0f7fb7_100%)] lg:block">
          <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#071733]/80 to-transparent" />
          <div className="relative flex h-full items-center justify-center p-10">
            <div className="relative h-[520px] w-[560px] max-w-full">
              <div className="absolute left-10 top-14 h-20 w-64 rounded-md border border-white/20 bg-white/10 p-4 backdrop-blur">
                <div className="h-2 w-28 rounded-full bg-cyan-200/80" />
                <div className="mt-4 h-2 w-48 rounded-full bg-white/35" />
                <div className="mt-2 h-2 w-36 rounded-full bg-white/25" />
              </div>
              <div className="absolute right-8 top-28 h-28 w-60 rounded-md border border-white/20 bg-white/12 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="h-2 w-20 rounded-full bg-white/50" />
                  <div className="h-7 w-7 rounded-full border border-cyan-200/70" />
                </div>
                <div className="mt-5 grid gap-2">
                  <div className="h-2 rounded-full bg-cyan-200/75" />
                  <div className="h-2 w-4/5 rounded-full bg-white/35" />
                  <div className="h-2 w-2/3 rounded-full bg-white/25" />
                </div>
              </div>
              <div className="absolute left-24 top-32 h-72 w-56 rounded-[2rem] border-[10px] border-slate-900/80 bg-white p-5 shadow-[0_28px_80px_rgba(0,0,0,0.22)]">
                <div className="mx-auto h-1.5 w-16 rounded-full bg-slate-200" />
                <div className="mt-7 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="mt-7 space-y-4">
                  {["Matriz auditada", "Evidencia validada", "Riesgo controlado"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-status-success-surface text-xs font-bold text-status-success-text">OK</span>
                      <span className="h-2 flex-1 rounded-full bg-slate-200" />
                    </div>
                  ))}
                </div>
                <div className="mt-7 h-9 rounded-md bg-primary" />
              </div>
              <div className="absolute bottom-16 right-20 h-36 w-72 rounded-lg border border-cyan-200/30 bg-[#071733]/50 p-5 text-white backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Control de Calidad</p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-2xl font-semibold">98%</p>
                    <p className="mt-1 text-xs text-cyan-100/70">calidad</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">100</p>
                    <p className="mt-1 text-xs text-cyan-100/70">controles</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">AI</p>
                    <p className="mt-1 text-xs text-cyan-100/70">evidencia</p>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-8 left-6 h-px w-[84%] bg-cyan-100/35" />
              <div className="absolute left-[22rem] top-16 h-16 w-16 rounded-2xl border border-cyan-100/40 bg-cyan-200/20 backdrop-blur" />
              <div className="absolute right-24 top-8 h-10 w-10 rounded-full border-4 border-cyan-200/60" />
              <div className="absolute bottom-36 left-2 h-12 w-12 rounded-full border border-white/25 bg-white/10" />
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="login-light flex min-h-screen items-center justify-center bg-[#f6f8fb]">
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-none">
            Cargando...
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  )
}

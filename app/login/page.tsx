"use client"

import { FormEvent, Suspense, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, Eye, EyeOff, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"

type AuthMode = "login" | "register"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/"
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
      router.replace(next)
    }
  }, [next, router, session])

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
        router.replace(next)
        return
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
        router.replace(next)
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
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}${next}` : undefined,
        },
      })

      if (googleError) throw googleError
      if (data?.url && typeof window !== "undefined") {
        window.location.href = data.url
      }
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : "No se pudo iniciar sesion con Gmail.")
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
      setError("Ingresa tu correo para enviarte el enlace de recuperacion.")
      return
    }

    setIsResettingPassword(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      })

      if (resetError) throw resetError
      setMessage("Te enviamos un enlace para recuperar tu contrasena.")
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "No se pudo enviar el enlace de recuperacion.")
    } finally {
      setIsResettingPassword(false)
    }
  }

  const toggleMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
    setMessage(null)
    setShowPassword(false)
  }

  return (
    <main className="login-light flex min-h-screen items-center justify-center bg-[#f6f8fb] px-5 py-6 text-slate-950">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.11)] lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="hidden lg:flex min-h-[540px] flex-col justify-center bg-[#071733] p-8 text-white">
          <div className="flex h-full flex-col justify-center gap-10">
            <div className="w-full max-w-[340px] rounded-3xl bg-white/5 p-5 shadow-inner shadow-white/5">
              <Image
                src="/logo1.png"
                alt="Qualittyx"
                width={405}
                height={132}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
            <div className="max-w-[360px] space-y-6">
              <div className="space-y-4">
                <h1 className="text-3xl font-semibold leading-tight">Gestion inteligente, acceso simple.</h1>
                <p className="text-sm leading-6 text-slate-300">
                  Entra al panel para coordinar auditorias, controles y evidencias con una experiencia clara y segura.
                </p>
              </div>
              <div className="grid gap-3 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  <p>Accede a datos de auditoria con velocidad y seguridad.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  <p>Gestiona controles y evidencias desde un solo lugar.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  <p>Interfaz limpia para equipos y clientes.</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-[540px] items-center justify-center px-6 py-7 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-6 flex justify-center lg:hidden">
              <div className="rounded-2xl bg-[#071733] px-5 py-3">
                <Image
                  src="/logo1.png"
                  alt="Qualittyx"
                  width={330}
                  height={108}
                  className="h-auto w-[250px] object-contain"
                  priority
                />
              </div>
            </div>

            <div className="mb-5">
              <p className="text-sm font-semibold text-primary">{mode === "login" ? "Iniciar sesion" : "Nuevo usuario"}</p>
              <h2 className="mt-1.5 text-3xl font-semibold tracking-tight">
                {mode === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {mode === "login"
                  ? "Ingresa con tu correo corporativo para continuar."
                  : "Completa tus datos para habilitar el acceso al sistema."}
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre y apellido</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ej. Ana Farina"
                      autoComplete="name"
                      required
                      className="h-11 rounded-xl bg-slate-50 pl-10"
                    />
                  </div>
                </div>
              )}

              {mode === "register" && (
                <div className="space-y-2">
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
                      className="h-11 rounded-xl bg-slate-50 pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="usuario@empresa.com"
                    autoComplete="email"
                    required
                    className="h-11 rounded-xl bg-slate-50 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contrasena</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimo 6 caracteres"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={6}
                    required
                    className="h-11 rounded-xl bg-slate-50 pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-9 w-9 text-muted-foreground"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {mode === "login" && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto px-0 py-0 text-xs font-semibold"
                      disabled={isResettingPassword}
                      onClick={handlePasswordReset}
                    >
                      {isResettingPassword ? "Enviando..." : "Olvidaste tu contrasena?"}
                    </Button>
                  </div>
                )}
              </div>

              {error && (
                <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              {message && (
                <p className="rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-sm text-success">
                  {message}
                </p>
              )}

              <Button type="submit" className="h-11 w-full rounded-xl" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {mode === "login" ? "Ingresar" : "Crear cuenta"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {mode === "login" ? "No tienes una cuenta?" : "Ya tienes una cuenta?"}{" "}
                <button
                  type="button"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                  onClick={() => toggleMode(mode === "login" ? "register" : "login")}
                >
                  {mode === "login" ? "Registrate aqui" : "Ingresa aqui"}
                </button>
              </p>

              <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>o</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl bg-white text-slate-700 hover:bg-slate-50"
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
                Continuar con Gmail
              </Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="login-light flex min-h-screen items-center justify-center bg-[#f6f8fb]">
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
            Preparando acceso...
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  )
}

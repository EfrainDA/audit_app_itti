"use client"

import { FormEvent, Suspense, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim() || email.split("@")[0],
          },
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
        },
      })

      if (signUpError) throw signUpError

      if (data.session) {
        await refreshProfile()
        router.replace(next)
      } else {
        setMessage("Revisa tu correo para confirmar la cuenta y luego inicia sesion.")
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "No se pudo completar la autenticacion.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_0.92fr]">
      <section className="flex min-h-screen flex-col justify-between border-r border-border/70 bg-card px-8 py-8 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Image src="/logo1.png" alt="Qualittyx" width={28} height={28} className="h-7 w-7 object-contain" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Qualittyx</p>
            <p className="text-xs text-muted-foreground">Control de calidad empresarial</p>
          </div>
        </div>

        <div className="max-w-xl py-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <ShieldCheck className="h-4 w-4" />
            Acceso seguro
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Ingresa al centro operativo de auditorias.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
            Gestiona lotes, controles, evidencias y calificaciones desde una sesion conectada a Supabase.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">Supabase Auth activo para este workspace.</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <Card className="w-full max-w-md border-border/70 bg-card">
          <CardHeader className="space-y-3">
            <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Ingresar</TabsTrigger>
                <TabsTrigger value="register">Crear cuenta</TabsTrigger>
              </TabsList>
            </Tabs>
            <CardTitle className="text-2xl">{mode === "login" ? "Bienvenido de vuelta" : "Crear nuevo acceso"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre y apellido</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ej. Ana Fariña"
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@empresa.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimo 6 caracteres"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={6}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9 text-muted-foreground"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {mode === "login" ? "Ingresar" : "Crear cuenta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <div className="rounded-xl border border-border/70 bg-card px-5 py-4 text-sm font-medium text-muted-foreground">
            Preparando acceso...
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  )
}

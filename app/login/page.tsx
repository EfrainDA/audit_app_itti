"use client"

import { FormEvent, Suspense, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react"
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
  const [company, setCompany] = useState("")
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#061126] px-5 py-10">
      <section className="w-full max-w-md">
        <Card className="w-full border-white/10 bg-white text-slate-950 shadow-[0_24px_70px_rgba(0,0,0,0.30)]">
          <CardHeader className="space-y-3">
            <div className="flex w-full justify-center pb-3">
              <div className="flex w-full items-center justify-center rounded-xl bg-[#061126] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Image
                src="/logo1.png"
                alt="Qualittyx"
                width={250}
                height={82}
                className="h-auto w-56 max-w-full object-contain"
                priority
              />
              </div>
            </div>
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
                    placeholder={"Ej. Ana Fari\u00f1a"}
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa a la que pertenece</Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder="Ej. itti"
                    autoComplete="organization"
                    required
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
                <Label htmlFor="password">{"Contrase\u00f1a"}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={"M\u00ednimo 6 caracteres"}
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
        <main className="flex min-h-screen items-center justify-center bg-[#061126]">
          <div className="rounded-xl border border-white/10 bg-white px-5 py-4 text-sm font-medium text-slate-600">
            Preparando acceso...
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  )
}

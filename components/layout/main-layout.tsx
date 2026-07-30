"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { AppShellSkeleton } from "@/components/ui/async-state"
import { Button } from "@/components/ui/button"
import { canAccessPath, getAllowedRoutes, getRouteDefinition } from "@/lib/domain/capabilities"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Header } from "./header"
import { MobileNav, Sidebar } from "./sidebar"

interface MainLayoutProps {
  children: React.ReactNode
}

// Marco privado que protege rutas y compone navegación, encabezado y contenido.
export function MainLayout({ children }: MainLayoutProps) {
  const { session, appUser, profileError, isLoading, refreshProfile, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [isLoading, pathname, router, session])

  const isRoleBlockedPath = Boolean(appUser && !canAccessPath(appUser.role, pathname))
  const routeDefinition = getRouteDefinition(pathname)
  useEffect(() => {
    if (!isLoading && session && isRoleBlockedPath) {
      router.replace("/")
    }
  }, [isLoading, isRoleBlockedPath, router, session])

  useEffect(() => {
    if (isLoading || !session) return

    getAllowedRoutes(appUser?.role).forEach((route) => {
      if (route.href !== pathname) router.prefetch(route.href)
    })
  }, [appUser?.role, isLoading, pathname, router, session])

  if (isLoading || !session) {
    return <AppShellSkeleton label="Preparando sesión" />
  }

  if (!appUser) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4">
        <section className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">No se pudo cargar tu perfil</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {profileError ?? "La sesión está activa, pero el perfil todavía no está disponible."}
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => void signOut()}>
              Cerrar sesión
            </Button>
            <Button onClick={() => void refreshProfile().catch(() => undefined)}>
              Reintentar
            </Button>
          </div>
        </section>
      </main>
    )
  }

  if (isRoleBlockedPath) {
    return <AppShellSkeleton label="Redirigiendo a una sección autorizada" />
  }

  return (
    <div className="relative flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header title={routeDefinition?.title ?? "Qualittyx"} subtitle={routeDefinition?.subtitle} />
        <main className="min-w-0 flex-1 overflow-auto scroll-smooth px-3 pb-20 pt-3 [scrollbar-gutter:stable] sm:px-5 sm:py-3 md:px-6 lg:px-6 lg:pb-5">
          <div className="mx-auto w-full max-w-[1520px]">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  )
}

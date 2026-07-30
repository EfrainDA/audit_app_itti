"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { MobileNav, Sidebar } from "./sidebar"
import { Header } from "./header"
import { useAuth } from "@/components/auth/auth-provider"
import { AppShellSkeleton } from "@/components/ui/async-state"
import { canAccessPath, getAllowedRoutes, getRouteDefinition } from "@/lib/domain/capabilities"

interface MainLayoutProps {
  children: React.ReactNode
}

// Marco privado que protege rutas y compone navegación, encabezado y contenido.
export function MainLayout({ children }: MainLayoutProps) {
  const { session, appUser, isLoading } = useAuth()
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

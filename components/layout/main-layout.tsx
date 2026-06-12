"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { MobileNav, Sidebar } from "./sidebar"
import { Header } from "./header"
import { useAuth } from "@/components/auth/auth-provider"

const PREFETCH_ROUTES = ["/", "/planificacion", "/evaluaciones", "/calificaciones", "/modelos", "/ajustes", "/preferencias"]

interface MainLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function MainLayout({ children, title }: MainLayoutProps) {
  const { session, appUser, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [isLoading, pathname, router, session])

  const isAuditorBlockedPath =
    appUser?.role === "auditor" && (pathname.startsWith("/modelos") || pathname.startsWith("/ajustes"))
  const isAuditadoBlockedPath =
    appUser?.role === "auditado" &&
    !(
      pathname === "/" ||
      pathname.startsWith("/evaluaciones") ||
      pathname.startsWith("/preferencias")
    )

  useEffect(() => {
    if (!isLoading && session && (isAuditorBlockedPath || isAuditadoBlockedPath)) {
      router.replace(isAuditorBlockedPath && pathname.startsWith("/ajustes") ? "/preferencias" : "/")
    }
  }, [isAuditadoBlockedPath, isAuditorBlockedPath, isLoading, pathname, router, session])

  useEffect(() => {
    if (isLoading || !session) return

    PREFETCH_ROUTES.forEach((route) => {
      if (route !== pathname) router.prefetch(route)
    })
  }, [isLoading, pathname, router, session])

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-xl border border-border/70 bg-card px-5 py-4 text-sm font-medium text-muted-foreground">
          Preparando sesion...
        </div>
      </div>
    )
  }

  if (isAuditorBlockedPath || isAuditadoBlockedPath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-xl border border-border/70 bg-card px-5 py-4 text-sm font-medium text-muted-foreground">
          Redirigiendo...
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header title={title} />
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

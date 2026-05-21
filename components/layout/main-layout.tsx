"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { MobileNav, Sidebar } from "./sidebar"
import { Header } from "./header"
import { useAuth } from "@/components/auth/auth-provider"

interface MainLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const { session, appUser, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isAuditorDashboard = appUser?.role === "auditor" && pathname === "/"

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [isLoading, pathname, router, session])

  const isAuditorAllowedPath =
    pathname === "/" || pathname.startsWith("/planificacion") || pathname.startsWith("/evaluaciones")

  useEffect(() => {
    if (!isLoading && session && appUser?.role === "auditor" && !isAuditorAllowedPath) {
      router.replace("/")
    }
  }, [appUser?.role, isAuditorAllowedPath, isLoading, router, session])

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-xl border border-border/70 bg-card px-5 py-4 text-sm font-medium text-muted-foreground">
          Preparando sesion...
        </div>
      </div>
    )
  }

  if (appUser?.role === "auditor" && !isAuditorAllowedPath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-xl border border-border/70 bg-card px-5 py-4 text-sm font-medium text-muted-foreground">
          Redirigiendo...
        </div>
      </div>
    )
  }

  if (isAuditorDashboard) {
    return (
      <div className="min-h-dvh overflow-auto bg-background px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto w-full max-w-[1520px]">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-auto scroll-smooth px-3 pb-24 pt-4 [scrollbar-gutter:stable] sm:px-6 sm:py-5 lg:px-8 lg:pb-5">
          <div className="mx-auto w-full max-w-[1520px]">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  )
}

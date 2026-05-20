"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { useAuth } from "@/components/auth/auth-provider"

interface MainLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const { session, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
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

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-auto scroll-smooth px-4 py-5 [scrollbar-gutter:stable] sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1520px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

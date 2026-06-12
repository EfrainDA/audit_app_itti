"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ChartColumn,
  CalendarDays,
  ClipboardCheck,
  Settings2,
  ChevronLeft,
  ChevronRight,
  House,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"

const navigation = [
  { name: "Dashboard", href: "/", icon: House },
  { name: "Modelos de Control", href: "/modelos", icon: SlidersHorizontal },
  { name: "Planificacion", href: "/planificacion", icon: CalendarDays },
  { name: "Evaluaciones", href: "/evaluaciones", icon: ClipboardCheck },
  { name: "Calificaciones", href: "/calificaciones", icon: ChartColumn },
  { name: "Ajustes", href: "/ajustes", icon: Settings2 },
]

const SIDEBAR_COLLAPSED_KEY = "audit-app-sidebar-collapsed"

export function Sidebar() {
  const pathname = usePathname()
  const { appUser } = useAuth()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"
  })
  const visibleNavigation = appUser?.role === "auditado"
    ? navigation.filter((item) => item.href === "/" || item.href === "/evaluaciones")
    : appUser?.role === "auditor"
    ? navigation.filter((item) => item.href !== "/modelos" && item.href !== "/ajustes")
    : navigation

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
  }, [collapsed])

  return (
    <aside
      className={cn(
        "relative hidden flex-col overflow-hidden border-r border-sidebar-border bg-sidebar shadow-none transition-all duration-200 lg:flex",
        collapsed ? "w-14" : "w-56"
      )}
    >
      <div className="relative z-10 flex h-16 items-center justify-center border-b border-sidebar-border px-4 shadow-none">
        {!collapsed && (
          <Link href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-[60px] w-full max-w-[280px] items-center justify-center">
              <Image
                src="/logo1.png"
                alt="Logo"
                width={405}
                height={90}
                className="h-[60px] w-auto object-contain"
              />
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "absolute text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed
              ? "right-1/2 h-9 w-9 translate-x-1/2 rounded-md border border-sidebar-border bg-sidebar-accent"
              : "right-4"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className={cn("relative z-10 flex-1 py-3", collapsed ? "space-y-2 px-2" : "space-y-1 px-2")}>
        {visibleNavigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center rounded-md text-sm font-semibold transition-colors duration-150",
                collapsed ? "justify-center px-0 py-1.5" : "gap-3 px-3 py-2",
                isActive
                  ? cn("text-sidebar-foreground", !collapsed && "border border-sidebar-border bg-sidebar-accent shadow-none")
                  : cn("text-sidebar-foreground/68 hover:text-sidebar-foreground", !collapsed && "hover:border-sidebar-border hover:bg-sidebar-accent/70")
              )}
              title={collapsed ? item.name : undefined}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-md border transition-colors duration-150",
                  collapsed ? "h-10 w-10" : "h-9 w-9",
                  isActive
                    ? "border-sidebar-primary/45 bg-sidebar-primary/10 text-sidebar-primary"
                    : "border-sidebar-border bg-transparent text-sidebar-foreground/72 group-hover:border-sidebar-primary/30 group-hover:text-sidebar-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 text-current"
                  )}
                  strokeWidth={1.8}
                />
              </span>
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const { appUser } = useAuth()
  const visibleNavigation = appUser?.role === "auditado"
    ? navigation.filter((item) => item.href === "/" || item.href === "/evaluaciones")
    : appUser?.role === "auditor"
    ? navigation.filter((item) => item.href !== "/modelos" && item.href !== "/ajustes")
    : navigation

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/98 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-none lg:hidden">
      <div className="responsive-scroll grid auto-cols-[minmax(4.75rem,1fr)] grid-flow-col gap-1 overflow-x-auto pb-1 sm:grid-flow-row sm:grid-cols-6 sm:overflow-visible sm:pb-0">
        {visibleNavigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex min-w-[4.75rem] flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-semibold transition-colors sm:min-w-0",
                isActive ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/62 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border",
                  isActive ? "border-sidebar-primary/45 bg-sidebar-primary/10 text-sidebar-primary" : "border-sidebar-border bg-transparent text-sidebar-foreground/72"
                )}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="w-full truncate text-center leading-tight">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

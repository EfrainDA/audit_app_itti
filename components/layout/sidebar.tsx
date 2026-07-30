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
  MoreHorizontal,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { getAllowedRoutes } from "@/lib/domain/capabilities"

const navigation = [
  { name: "Dashboard", href: "/", icon: House },
  { name: "Modelos de Control", href: "/modelos", icon: SlidersHorizontal },
  { name: "Planificación", href: "/planificacion", icon: CalendarDays },
  { name: "Evaluaciones", href: "/evaluaciones", icon: ClipboardCheck },
  { name: "Calificaciones", href: "/calificaciones", icon: ChartColumn },
  { name: "Ajustes", href: "/ajustes", icon: Settings2 },
]

const SIDEBAR_COLLAPSED_KEY = "audit-app-sidebar-collapsed"

function navigationForRole(role?: Parameters<typeof getAllowedRoutes>[0]) {
  const allowed = new Set<string>(getAllowedRoutes(role).map((route) => route.href))
  return navigation.filter((item) => allowed.has(item.href))
}

// Navegación de escritorio que conserva localmente su estado contraído.
export function Sidebar() {
  const pathname = usePathname()
  const { appUser } = useAuth()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"
  })
  const visibleNavigation = navigationForRole(appUser?.role)

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

// Variante de navegación adaptada a pantallas pequeñas.
export function MobileNav() {
  const pathname = usePathname()
  const { appUser } = useAuth()
  const visibleNavigation = navigationForRole(appUser?.role)
  const activeItem = visibleNavigation.find(
    (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)),
  )
  const primaryNavigation = visibleNavigation.length <= 5
    ? visibleNavigation
    : activeItem && !visibleNavigation.slice(0, 4).some((item) => item.href === activeItem.href)
      ? [...visibleNavigation.slice(0, 3), activeItem]
      : visibleNavigation.slice(0, 4)
  const primaryHrefs = new Set(primaryNavigation.map((item) => item.href))
  const overflowNavigation = visibleNavigation.filter((item) => !primaryHrefs.has(item.href))

  return (
    <nav aria-label="Navegación principal" className="elevation-1 fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/98 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div
        className="grid gap-1 pb-1"
        style={{ gridTemplateColumns: `repeat(${primaryNavigation.length + (overflowNavigation.length ? 1 : 0)}, minmax(0, 1fr))` }}
      >
        {primaryNavigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-semibold transition-colors",
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

        {overflowNavigation.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-semibold text-sidebar-foreground/72 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-foreground focus-visible:outline-none"
                aria-label="Mostrar más destinos"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sidebar-border bg-transparent">
                  <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <span className="w-full truncate text-center leading-tight">Más</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" sideOffset={8} className="min-w-52">
              {overflowNavigation.map((item) => (
                <DropdownMenuItem key={item.name} asChild>
                  <Link href={item.href} className="flex cursor-pointer items-center gap-3">
                    <item.icon className="h-4 w-4" strokeWidth={1.8} />
                    {item.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  )
}

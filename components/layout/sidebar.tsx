"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ChartColumn,
  CalendarDays,
  ClipboardCheck,
  Settings2,
  ChevronLeft,
  ChevronRight,
  House,
  LogOut,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth/auth-provider"

const navigation = [
  { name: "Dashboard", href: "/", icon: House },
  { name: "Modelos de Control", href: "/modelos", icon: SlidersHorizontal },
  { name: "Planificación", href: "/planificacion", icon: CalendarDays },
  { name: "Evaluaciones", href: "/evaluaciones", icon: ClipboardCheck },
  { name: "Calificaciones", href: "/calificaciones", icon: ChartColumn },
  { name: "Ajustes", href: "/ajustes", icon: Settings2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { appUser, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const visibleNavigation = appUser?.role === "auditor"
    ? navigation.filter((item) => item.href !== "/modelos" && item.href !== "/ajustes")
    : navigation
  const userName = appUser?.name ?? "Usuario"
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .filter((_, index, parts) => index === 0 || index === parts.length - 1)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U"

  const handleSignOut = async () => {
    await signOut()
    router.replace("/login")
  }

  return (
    <aside
      className={cn(
        "relative hidden flex-col overflow-hidden border-r border-[#19315f] bg-[#061126] shadow-none transition-all duration-300 dark:border-neutral-800 dark:bg-[#050505] lg:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="relative z-10 flex h-16 items-center justify-center border-b border-white/10 px-4 shadow-none dark:border-neutral-800">
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
        {collapsed && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-[48px] w-[48px] items-center justify-center">
            <Image
              src="/logo1.png"
              alt="Logo"
              width={72}
              height={72}
              className="h-[48px] w-[48px] object-contain"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "absolute text-white/80 hover:bg-white/10 hover:text-white",
            collapsed
              ? "right-1/2 h-9 w-9 translate-x-1/2 rounded-md border border-white/14 bg-[#06122d] dark:border-neutral-700 dark:bg-neutral-950"
              : "right-4"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className={cn("relative z-10 flex-1 py-4", collapsed ? "space-y-2 px-2" : "space-y-1 px-2")}>
        {visibleNavigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center rounded-lg text-sm font-semibold transition-all duration-200",
                collapsed ? "justify-center px-0 py-1.5" : "gap-3 px-3 py-2.5",
                isActive
                  ? cn("text-white", !collapsed && "border border-white/16 bg-white/12 shadow-none")
                  : cn("text-white/68 hover:text-white", !collapsed && "hover:border-white/12 hover:bg-white/9")
              )}
              title={collapsed ? item.name : undefined}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-md border transition-all duration-200",
                  collapsed ? "h-10 w-10" : "h-9 w-9",
                  isActive
                    ? "border-cyan-300/40 bg-transparent text-cyan-100"
                    : "border-white/14 bg-transparent text-white/72 group-hover:border-white/24 group-hover:text-white"
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

      <div className={cn("relative z-10 border-t border-white/10 px-2 py-4", collapsed && "px-1")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-left shadow-none transition-colors hover:bg-white/10",
                collapsed && "justify-center border-transparent bg-transparent px-1"
              )}
              title={collapsed ? userName : undefined}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-transparent shadow-none">
                {appUser?.avatar ? (
                  <img src={appUser.avatar} alt={userName} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-cyan-200">{userInitials}</span>
                )}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{userName}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-56">
            <DropdownMenuLabel>
              <p className="truncate text-sm font-semibold">{userName}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/preferencias">
                <Settings2 className="h-4 w-4 mr-2" />
                Preferencias
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const { appUser } = useAuth()
  const visibleNavigation = appUser?.role === "auditor"
    ? navigation.filter((item) => item.href !== "/modelos" && item.href !== "/ajustes")
    : navigation

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#061126]/98 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-none dark:border-neutral-800 dark:bg-[#050505]/98 lg:hidden">
      <div className="responsive-scroll grid auto-cols-[minmax(4.75rem,1fr)] grid-flow-col gap-1 overflow-x-auto pb-1 sm:grid-flow-row sm:grid-cols-6 sm:overflow-visible sm:pb-0">
        {visibleNavigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex min-w-[4.75rem] flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-semibold transition-colors sm:min-w-0",
                isActive ? "bg-white/12 text-white" : "text-white/62 hover:bg-white/8 hover:text-white"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border",
                  isActive ? "border-cyan-300/40 bg-transparent text-cyan-100" : "border-white/10 bg-transparent text-white/72"
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

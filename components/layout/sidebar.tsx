"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Activity,
  Cpu,
  CalendarDays,
  ClipboardList,
  Settings2,
  ChevronLeft,
  ChevronRight,
  LogOut,
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
  { name: "Dashboard", href: "/", icon: Activity },
  { name: "Modelos de Control", href: "/modelos", icon: Cpu },
  { name: "Planificación", href: "/planificacion", icon: CalendarDays },
  { name: "Evaluaciones", href: "/evaluaciones", icon: ClipboardList },
  { name: "Ajustes", href: "/ajustes", icon: Settings2 },
]

function getIconTone(href: string) {
  switch (href) {
    case "/":
      return "border-cyan-300/35 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.35),transparent_28%),linear-gradient(145deg,rgba(34,211,238,0.34),rgba(14,116,144,0.22))] text-cyan-100 shadow-[0_8px_18px_rgba(34,211,238,0.20)]"
    case "/modelos":
      return "border-sky-300/35 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.34),transparent_28%),linear-gradient(145deg,rgba(96,165,250,0.34),rgba(37,99,235,0.20))] text-sky-100 shadow-[0_8px_18px_rgba(96,165,250,0.18)]"
    case "/planificacion":
      return "border-indigo-300/35 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.34),transparent_28%),linear-gradient(145deg,rgba(129,140,248,0.34),rgba(79,70,229,0.20))] text-indigo-100 shadow-[0_8px_18px_rgba(129,140,248,0.18)]"
    case "/evaluaciones":
      return "border-emerald-300/35 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.34),transparent_28%),linear-gradient(145deg,rgba(52,211,153,0.34),rgba(5,150,105,0.20))] text-emerald-100 shadow-[0_8px_18px_rgba(52,211,153,0.18)]"
    case "/ajustes":
      return "border-violet-300/35 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.34),transparent_28%),linear-gradient(145deg,rgba(167,139,250,0.34),rgba(124,58,237,0.20))] text-violet-100 shadow-[0_8px_18px_rgba(167,139,250,0.18)]"
    default:
      return "border-white/16 bg-white/8 text-white/85"
  }
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { appUser, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const userName = appUser?.name ?? "Usuario"
  const userRole = appUser?.role ?? "sesion activa"
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
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
        "relative flex flex-col overflow-hidden border-r border-[#19315f] bg-[#061126] shadow-[18px_0_42px_rgba(0,0,0,0.22)] transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="relative z-10 flex h-16 items-center justify-center border-b border-white/10 px-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        {!collapsed && (
          <Link href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-10 w-full max-w-[260px] items-center justify-center">
              <Image
                src="/logo1.png"
                alt="Logo"
                width={144}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </div>
          </Link>
        )}
        {collapsed && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center">
            <Image
              src="/logo1.png"
              alt="Logo"
              width={20}
              height={20}
              className="h-4 w-4 object-contain"
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
              ? "right-1/2 h-9 w-9 translate-x-1/2 rounded-xl border border-white/14 bg-[#06122d]"
              : "right-4"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className={cn("relative z-10 flex-1 py-4", collapsed ? "space-y-2 px-2" : "space-y-1 px-2")}>
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center rounded-lg text-sm font-semibold transition-all duration-200",
                collapsed ? "justify-center px-0 py-1.5" : "gap-3 px-3 py-2.5",
                isActive
                  ? cn("text-white", !collapsed && "border border-white/16 bg-white/12 shadow-[0_12px_26px_rgba(0,0,0,0.20)]")
                  : cn("text-white/68 hover:text-white", !collapsed && "hover:border-white/12 hover:bg-white/9")
              )}
              title={collapsed ? item.name : undefined}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-xl border transition-all duration-200",
                  collapsed ? "h-10 w-10" : "h-9 w-9",
                  isActive
                    ? getIconTone(item.href)
                    : cn("opacity-80 grayscale-[0.25] group-hover:opacity-100 group-hover:grayscale-0", getIconTone(item.href))
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 text-current drop-shadow-[0_2px_3px_rgba(0,0,0,0.30)]"
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
                "flex w-full items-center gap-3 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition-colors hover:bg-white/10",
                collapsed && "justify-center border-transparent bg-transparent px-1"
              )}
              title={collapsed ? userName : undefined}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 shadow-[0_8px_18px_rgba(56,189,248,0.18)]">
                <span className="text-xs font-bold text-cyan-200">{userInitials}</span>
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{userName}</p>
                  <p className="truncate text-xs capitalize text-white/60">{userRole}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right" className="w-56">
            <DropdownMenuLabel>
              <p className="truncate text-sm font-semibold">{userName}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">{userRole}</p>
            </DropdownMenuLabel>
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

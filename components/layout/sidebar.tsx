"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileCheck,
  Calendar,
  ClipboardCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Modelos de Control", href: "/modelos", icon: FileCheck },
  { name: "Planificacion", href: "/planificacion", icon: Calendar },
  { name: "Evaluaciones", href: "/evaluaciones", icon: ClipboardCheck },
  { name: "Ajustes", href: "/ajustes", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "relative flex flex-col overflow-hidden border-r border-sidebar-border bg-sidebar shadow-[18px_0_54px_oklch(0.18_0.055_255/0.26)] transition-all duration-300 before:absolute before:inset-0 before:bg-[linear-gradient(150deg,oklch(0.28_0.07_252/0.72),transparent_38%),linear-gradient(90deg,oklch(1_0_0/0.075)_0_1px,transparent_1px_100%)] before:bg-[length:100%_100%,18px_18px] before:opacity-80 before:content-[''] after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-gradient-to-b after:from-transparent after:via-white/32 after:to-transparent",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="relative z-10 flex h-16 items-center justify-between border-b border-white/10 px-4 shadow-[inset_0_-1px_0_oklch(0_0_0/0.18)]">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/16 bg-white/10 shadow-[inset_0_1px_0_oklch(1_0_0/0.18),0_12px_30px_oklch(0_0_0/0.30)]">
              <div className="absolute inset-0 rounded-lg bg-[linear-gradient(145deg,white_0%,transparent_34%,oklch(0.72_0.105_230/0.20)_100%)] opacity-35" />
              <Sparkles className="relative h-4 w-4 text-sidebar-primary drop-shadow-[0_0_8px_oklch(0.72_0.105_230/0.5)]" strokeWidth={1.8} />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-bold tracking-wide text-sidebar-foreground">Qualittyx</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-primary">Audit OS</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-white/16 bg-white/10 shadow-[inset_0_1px_0_oklch(1_0_0/0.18),0_12px_30px_oklch(0_0_0/0.30)]">
            <Sparkles className="h-4 w-4 text-sidebar-primary drop-shadow-[0_0_8px_oklch(0.72_0.105_230/0.5)]" strokeWidth={1.8} />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "text-sidebar-foreground/72 hover:bg-white/10 hover:text-white",
            collapsed && "absolute right-0 z-10 translate-x-1/2 border border-white/14 bg-sidebar shadow-[0_10px_24px_oklch(0_0_0/0.24)]"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="relative z-10 flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                isActive
                  ? "border border-white/16 bg-white/12 text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.12),0_14px_30px_oklch(0_0_0/0.24)] before:absolute before:left-0 before:top-2 before:h-6 before:w-0.5 before:rounded-full before:bg-sidebar-primary"
                  : "text-sidebar-foreground/72 hover:bg-white/8 hover:text-white"
              )}
              title={collapsed ? item.name : undefined}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-all duration-200",
                  isActive
                    ? "border-sidebar-primary/32 bg-sidebar-primary/16 shadow-[inset_0_1px_0_oklch(1_0_0/0.16),0_0_20px_oklch(0.72_0.105_230/0.22)]"
                    : "border-white/10 bg-white/6 group-hover:border-white/16 group-hover:bg-white/10"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 drop-shadow-[0_1px_1px_oklch(0_0_0/0.4)]",
                    isActive ? "text-sidebar-primary" : "text-sidebar-foreground/82"
                  )}
                  strokeWidth={1.75}
                />
              </span>
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={cn("relative z-10 border-t border-white/10 px-2 py-4", collapsed && "px-1")}>
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border border-white/12 bg-white/8 px-3 py-2 shadow-[inset_0_1px_0_oklch(1_0_0/0.10)]",
            collapsed && "justify-center border-transparent bg-transparent"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sidebar-primary/24 bg-sidebar-primary/14 shadow-[0_8px_18px_oklch(0_0_0/0.22)]">
            <span className="text-xs font-bold text-sidebar-primary">EG</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">Efrain Gonzalez</p>
              <p className="truncate text-xs text-sidebar-foreground/52">Admin Command</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Activity,
  Cpu,
  CalendarDays,
  ClipboardList,
  Settings2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const navigation = [
  { name: "Dashboard", href: "/", icon: Activity },
  { name: "Modelos de Control", href: "/modelos", icon: Cpu },
  { name: "Planificacion", href: "/planificacion", icon: CalendarDays },
  { name: "Evaluaciones", href: "/evaluaciones", icon: ClipboardList },
  { name: "Ajustes", href: "/ajustes", icon: Settings2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "relative flex flex-col overflow-hidden border-r border-[#0f2246] bg-[#06122d] shadow-[18px_0_54px_rgba(0,0,0,0.24)] transition-all duration-300",
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
            "absolute right-4 text-white/80 hover:bg-white/10 hover:text-white",
            collapsed && "border border-white/14 bg-[#06122d] shadow-[0_10px_24px_rgba(0,0,0,0.24)]"
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
                  ? "border border-white/16 bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_30px_rgba(0,0,0,0.24)] before:absolute before:left-0 before:top-2 before:h-6 before:w-0.5 before:rounded-full before:bg-cyan-300"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
              title={collapsed ? item.name : undefined}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-all duration-200",
                  isActive
                    ? "border-cyan-300/40 bg-cyan-300/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_rgba(56,189,248,0.18)]"
                    : "border-white/10 bg-white/5 group-hover:border-white/16 group-hover:bg-white/10"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.24)]",
                    isActive ? "text-cyan-300" : "text-white/80"
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
            "flex items-center gap-3 rounded-lg border border-white/12 bg-white/5 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
            collapsed && "justify-center border-transparent bg-transparent"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 shadow-[0_8px_18px_rgba(56,189,248,0.18)]">
            <span className="text-xs font-bold text-cyan-200">EG</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">Efrain Gonzalez</p>
              <p className="truncate text-xs text-white/60">Admin Command</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

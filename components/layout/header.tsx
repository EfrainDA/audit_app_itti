"use client"

import { useEffect, useState } from "react"
import { Bell, Search, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import { markAllNotificationsRead, markNotificationRead } from "@/lib/supabase-data"

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { data, refresh } = useAppData()
  const { appUser } = useAuth()
  const notifications = data.notificaciones
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const unreadCount = notifications.filter(n => !n.leida).length
  const isDark = resolvedTheme === "dark"

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMarkNotificationRead = async (id: string) => {
    await markNotificationRead(id)
    await refresh()
  }

  const handleMarkAllNotificationsRead = async () => {
    await markAllNotificationsRead(notifications.filter((notification) => !notification.leida).map((notification) => notification.id))
    await refresh()
  }

  return (
    <header className="relative flex min-h-16 items-center justify-between gap-2 border-b border-border/70 bg-card px-3 py-2 shadow-[var(--material-shadow-soft)] sm:gap-3 sm:px-5 md:px-6 lg:h-16 lg:py-0">
      <div className="min-w-0 flex-1 pr-1">
        <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">{title}</h1>
        {subtitle && <p className="line-clamp-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <Input
            placeholder="Buscar..."
            className="w-48 border-border/80 bg-card pl-9 lg:w-72"
          />
        </div>

        {appUser?.role !== "auditor" && (
          <Button
            variant="outline"
            size="icon"
            aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
            title={isDark ? "Modo claro" : "Modo oscuro"}
            className="icon-orb relative overflow-hidden border-primary/20 bg-primary/8 text-primary hover:bg-primary/12"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {mounted && isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/60 bg-destructive text-xs font-bold text-destructive-foreground shadow-[0_8px_18px_oklch(0.64_0.22_25/0.14)]">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-1.5rem)] max-w-80">
            <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.slice(0, 5).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                onClick={() => handleMarkNotificationRead(notification.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  {!notification.leida && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  <span className="font-medium text-sm">{notification.titulo}</span>
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2 pl-4">
                  {notification.mensaje}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary cursor-pointer" onClick={handleMarkAllNotificationsRead}>
              Marcar todas como leidas
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  )
}

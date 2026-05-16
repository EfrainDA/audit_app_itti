"use client"

import { Bell, Search, HelpCircle, Activity } from "lucide-react"
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
import { mockNotificaciones } from "@/lib/data"
import { useState } from "react"

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const [notifications] = useState(mockNotificaciones)
  const unreadCount = notifications.filter(n => !n.leida).length

  return (
    <header className="relative flex h-16 items-center justify-between border-b border-border/70 bg-card/86 px-4 shadow-[0_12px_32px_oklch(0.28_0.025_252/0.07)] backdrop-blur-2xl sm:px-6">
      <div className="min-w-0">
        <div className="mb-0.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/85">
          <Activity className="h-3.5 w-3.5" />
          Live Control Layer
        </div>
        <h1 className="truncate text-xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-72 border-border/80 bg-white/80 pl-9"
          />
        </div>

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-destructive/30 bg-destructive text-xs font-bold text-destructive-foreground shadow-[0_8px_18px_oklch(0.64_0.22_25/0.18)]">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.slice(0, 5).map((notification) => (
              <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 py-3 cursor-pointer">
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
            <DropdownMenuItem className="justify-center text-primary cursor-pointer">
              Ver todas las notificaciones
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

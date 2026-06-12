"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, LogOut, Search, Settings2 } from "lucide-react"
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
import { formatEstado } from "@/lib/data"
import type { Notificacion } from "@/lib/data"

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function matchesSearch(search: string, ...values: unknown[]) {
  return values.some((value) => normalizeSearch(value).includes(search))
}

function getNotificationHref(notification: Notificacion) {
  const title = normalizeSearch(notification.titulo)
  const message = normalizeSearch(notification.mensaje)
  const evaluationHref = notification.mensaje.match(/\/evaluaciones\/[0-9a-f-]{32,36}/i)?.[0]

  if (evaluationHref) return evaluationHref
  if (notification.tipo === "replica") return "/evaluaciones"
  if (title.includes("auditor termino")) return "/"
  if (title.includes("lote") || message.includes("lote")) return "/planificacion"
  if (title.includes("control") || title.includes("reasignacion") || message.includes("control")) return "/evaluaciones"
  return "/"
}

interface HeaderProps {
  title: string
}

const YEAR_KEY = "a\u00f1o" as const

export function Header({ title }: HeaderProps) {
  const { data, refresh } = useAppData()
  const { appUser, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const notifications = data.notificaciones
  const unreadCount = notifications.filter(n => !n.leida).length
  const normalizedSearch = normalizeSearch(searchTerm)
  const userName = appUser?.name ?? "Usuario"
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .filter((_, index, parts) => index === 0 || index === parts.length - 1)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U"

  useEffect(() => {
    if (!isSearchExpanded) return
    window.setTimeout(() => searchInputRef.current?.focus(), 0)
  }, [isSearchExpanded])

  const searchResults = useMemo(() => {
    if (!normalizedSearch) return []

    const canSeeSettings = appUser?.role === "admin" || appUser?.role === "supervisor"
    const canSeeModels = appUser?.role !== "auditor"
    const pages = [
      { title: "Dashboard", subtitle: "Vista general del sistema", href: "/", keywords: "inicio metricas resumen" },
      { title: "Planificacion", subtitle: "Lotes, ciclos y asignaciones", href: "/planificacion", keywords: "lotes ciclos unidades auditores" },
      { title: "Evaluaciones", subtitle: "Evaluaciones de control", href: "/evaluaciones", keywords: "controles auditorias auditor" },
      { title: "Calificaciones", subtitle: "Resultados y calificaciones", href: "/calificaciones", keywords: "scores resultados notas" },
      ...(canSeeModels ? [{ title: "Modelos de Control", subtitle: "Modelos, verticales y parametros", href: "/modelos", keywords: "metodologia parametros verticales" }] : []),
      ...(canSeeSettings ? [{ title: "Ajustes", subtitle: "Usuarios, unidades, ciclos y umbrales", href: "/ajustes", keywords: "configuracion usuarios unidades negocio" }] : []),
      { title: "Preferencias", subtitle: "Perfil, cargo, area, empresa y tema", href: "/preferencias", keywords: "perfil contrasena cargo area empresa" },
    ]

    const pageResults = pages
      .filter((page) => matchesSearch(normalizedSearch, page.title, page.subtitle, page.keywords))
      .map((page) => ({ ...page, type: "Pagina" }))

    const unitResults = data.unidades
      .filter((unit) => matchesSearch(normalizedSearch, unit.nombre, unit.ecosistema, unit.codigo, unit.zona, unit.responsable))
      .map((unit) => ({
        type: "Unidad",
        title: unit.nombre,
        subtitle: [unit.ecosistema, unit.codigo].filter(Boolean).join(" - "),
        href: "/planificacion",
      }))

    const modelResults = canSeeModels
      ? data.modelos
          .filter((model) => matchesSearch(normalizedSearch, model.nombre, model.descripcion, formatEstado(model.estado)))
          .map((model) => ({
            type: "Modelo",
            title: model.nombre,
            subtitle: `${formatEstado(model.estado)} - ${model.verticales.length} verticales`,
            href: "/modelos",
          }))
      : []

    const lotResults = data.lotes
      .map((lote) => {
        const unidad = data.unidades.find((unit) => unit.id === lote.unidadNegocioId)
        const modelo = data.modelos.find((model) => model.id === lote.modeloControlId)
        return {
          type: "Lote",
          title: `${unidad?.nombre ?? "Unidad"} - Ciclo ${lote.ciclo}`,
          subtitle: `${modelo?.nombre ?? "Modelo"} - ${formatEstado(lote.estado)}`,
          href: "/planificacion",
          text: [unidad?.nombre, modelo?.nombre, `ciclo ${lote.ciclo}`, String(lote[YEAR_KEY]), lote.estado],
        }
      })
      .filter((result) => matchesSearch(normalizedSearch, result.title, result.subtitle, ...result.text))

    const controlResults = data.loteVerticales
      .flatMap((loteVertical) => loteVertical.controles)
      .filter((control) =>
        matchesSearch(
          normalizedSearch,
          control.identificador,
          control.descripcion,
          control.proceso,
          control.subproceso,
          control.producto,
          formatEstado(control.estado),
        ),
      )
      .map((control) => ({
        type: "Control",
        title: control.identificador,
        subtitle: [control.proceso, control.subproceso, formatEstado(control.estado)].filter(Boolean).join(" - "),
        href: `/evaluaciones/${control.id}`,
      }))

    const userResults = canSeeSettings
      ? data.users
          .filter((user) => matchesSearch(normalizedSearch, user.name, user.email, user.company, user.cargo, user.area, user.role))
          .map((user) => ({
            type: "Usuario",
            title: user.name,
            subtitle: [user.cargo || user.role, user.email].filter(Boolean).join(" - "),
            href: "/ajustes",
          }))
      : []

    return [...pageResults, ...controlResults, ...lotResults, ...unitResults, ...modelResults, ...userResults].slice(0, 8)
  }, [appUser?.role, data.loteVerticales, data.lotes, data.modelos, data.unidades, data.users, normalizedSearch])

  const handleNotificationClick = async (notification: Notificacion) => {
    await markNotificationRead(notification.id)
    await refresh()
    const href = getNotificationHref(notification)
    if (href !== pathname) router.push(href)
  }

  const handleMarkAllNotificationsRead = async () => {
    await markAllNotificationsRead(notifications.filter((notification) => !notification.leida).map((notification) => notification.id))
    await refresh()
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace("/login")
  }

  const handleSelectResult = (href: string) => {
    setSearchTerm("")
    setIsSearchOpen(false)
    setIsSearchExpanded(false)
    if (href !== pathname) {
      router.push(href)
    }
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && searchResults[0]) {
      event.preventDefault()
      handleSelectResult(searchResults[0].href)
    }

    if (event.key === "Escape") {
      setIsSearchOpen(false)
      setIsSearchExpanded(false)
      setSearchTerm("")
    }
  }

  return (
    <header className="relative flex h-16 min-h-16 items-center justify-between gap-2 border-b border-border/70 bg-white px-3 shadow-none dark:bg-background sm:gap-3 sm:px-5 md:px-6">
      <div className="min-w-0 flex-1 pr-1">
        <h1 className="truncate text-lg font-semibold leading-none text-foreground sm:text-xl">{title}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
        <div className="relative flex items-center">
          {isSearchExpanded ? (
            <div className="relative w-48 lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
              <Input
                ref={searchInputRef}
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setIsSearchOpen(true)
                }}
                onFocus={() => setIsSearchOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => {
                    setIsSearchOpen(false)
                    if (!searchTerm.trim()) setIsSearchExpanded(false)
                  }, 120)
                }}
                onKeyDown={handleSearchKeyDown}
                className="h-9 border-border/80 bg-card pl-9"
              />

              {isSearchOpen && searchTerm.trim() && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[22rem] overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
                  {searchResults.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto py-1">
                      {searchResults.map((result, index) => (
                        <button
                          key={`${result.type}-${result.href}-${result.title}-${index}`}
                          type="button"
                          className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-secondary/80 focus:bg-secondary/80 focus:outline-none"
                          onMouseDown={(event) => {
                            event.preventDefault()
                            handleSelectResult(result.href)
                          }}
                        >
                          <span className="mt-0.5 rounded-md border border-border/70 bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-normal text-muted-foreground">
                            {result.type}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">{result.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-4 text-sm text-muted-foreground">
                      Sin resultados para "{searchTerm.trim()}"
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Abrir busqueda"
              onClick={() => {
                setIsSearchExpanded(true)
                setIsSearchOpen(true)
              }}
            >
              <Search className="h-5 w-5" />
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/60 bg-destructive text-xs font-bold text-destructive-foreground shadow-none">
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
                onClick={() => handleNotificationClick(notification)}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Abrir menu de usuario"
            >
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-card shadow-none">
                {appUser?.avatar ? (
                  <img src={appUser.avatar} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-primary">{userInitials}</span>
                )}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-64">
            <DropdownMenuLabel className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
                {appUser?.avatar ? (
                  <img src={appUser.avatar} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-primary">{userInitials}</span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{userName}</span>
                {appUser?.email && (
                  <span className="block truncate text-xs font-normal text-muted-foreground">{appUser.email}</span>
                )}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/preferencias" className="cursor-pointer">
                <Settings2 className="mr-2 h-4 w-4" />
                Preferencias
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  )
}

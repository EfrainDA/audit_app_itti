"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { SafeImage } from "@/components/ui/safe-image"
import { useNotifications } from "@/hooks/use-notifications"
import { useSearchIndex } from "@/hooks/use-search-index"
import type { Notificacion } from "@/lib/data"
import { formatEstado } from "@/lib/data"
import { getAllowedRoutes, hasCapability } from "@/lib/domain/capabilities"
import { Bell, BellOff, LogOut, Search, Settings2, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"

// Normaliza textos para que la búsqueda ignore mayúsculas y tildes.
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
  const planningHref = notification.mensaje.match(/\/planificacion\/[0-9a-f-]{32,36}/i)?.[0]

  if (evaluationHref) return evaluationHref
  if (planningHref) return planningHref
  if (title.includes("auditor termino")) return "/"
  if (title.includes("lote") || message.includes("lote")) return "/planificacion"
  if (title.includes("control") || title.includes("reasignacion") || message.includes("control")) return "/evaluaciones"
  return "/"
}

interface HeaderProps {
  title: string
  subtitle?: string
}

// Encabezado global con búsqueda, ciclo, notificaciones y menú de usuario.
export function Header({ title, subtitle }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [activeSearchIndex, setActiveSearchIndex] = useState(0)
  const { data: searchIndex } = useSearchIndex(isSearchExpanded)
  const { notifications, markRead, markAllRead } = useNotifications()
  const { appUser, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchInputRef = useRef<HTMLInputElement>(null)
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

  useEffect(() => {
    const handleGlobalSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setIsSearchExpanded(true)
        setIsSearchOpen(true)
      }

      if (event.key === "Escape") {
        setIsSearchOpen(false)
        setIsSearchExpanded(false)
        setSearchTerm("")
      }
    }

    window.addEventListener("keydown", handleGlobalSearchShortcut)
    return () => window.removeEventListener("keydown", handleGlobalSearchShortcut)
  }, [])

  const searchResults = useMemo(() => {
    if (!normalizedSearch) return []

    const canSeeSettings = hasCapability(appUser?.role, "settings:view")
    const canSeeModels = hasCapability(appUser?.role, "models:view")
    const canSeePlanning = hasCapability(appUser?.role, "planning:view")
    const pages = getAllowedRoutes(appUser?.role).map((route) => ({
      ...route,
      keywords: `${route.title} ${route.subtitle}`,
    }))

    const pageResults = pages
      .filter((page) => matchesSearch(normalizedSearch, page.title, page.subtitle, page.keywords))
      .map((page) => ({ ...page, type: "Página" }))

    const unitResults = canSeePlanning ? searchIndex.units
      .filter((unit) => matchesSearch(normalizedSearch, unit.name, unit.ecosystem))
      .map((unit) => ({
        type: "Unidad",
        title: unit.name,
        subtitle: unit.ecosystem,
        href: "/planificacion",
      }))
      : []

    const modelResults = canSeeModels
      ? searchIndex.models
          .filter((model) => matchesSearch(normalizedSearch, model.name, model.description, model.status))
          .map((model) => ({
            type: "Modelo",
            title: model.name,
            subtitle: formatEstado(model.status as never),
            href: "/modelos",
          }))
      : []

    const lotResults = canSeePlanning ? searchIndex.lots
      .map((lote) => {
        const unidad = searchIndex.units.find((unit) => unit.id === lote.businessUnitId)
        const modelo = searchIndex.models.find((model) => model.id === lote.modelId)
        return {
          type: "Lote",
          title: `${unidad?.name ?? "Unidad"} - Ciclo ${lote.bimester}`,
          subtitle: `${modelo?.name ?? "Modelo"} - ${formatEstado(lote.status as never)}`,
          href: "/planificacion",
          text: [unidad?.name, modelo?.name, `ciclo ${lote.bimester}`, String(lote.year), lote.status],
        }
      })
      .filter((result) => matchesSearch(normalizedSearch, result.title, result.subtitle, ...result.text))
      : []

    const controlResults = searchIndex.controls
      .filter((control) =>
        matchesSearch(
          normalizedSearch,
          control.identifier,
          control.description,
          control.process,
          control.subprocess,
          control.product,
          control.status,
        ),
      )
      .map((control) => ({
        type: "Control",
        title: control.identifier,
        subtitle: [control.process, control.subprocess, formatEstado(control.status as never)].filter(Boolean).join(" - "),
        href: `/evaluaciones/${control.id}`,
      }))

    const userResults = canSeeSettings
      ? searchIndex.users
          .filter((user) => matchesSearch(normalizedSearch, user.name, user.email, user.company, user.cargo, user.area, user.role))
          .map((user) => ({
            type: "Usuario",
            title: user.name,
            subtitle: [user.cargo || user.role, user.email].filter(Boolean).join(" - "),
            href: "/ajustes",
          }))
      : []

    return [...pageResults, ...controlResults, ...lotResults, ...unitResults, ...modelResults, ...userResults].slice(0, 8)
  }, [appUser?.role, normalizedSearch, searchIndex])

  const handleNotificationClick = async (notification: Notificacion) => {
    await markRead(notification.id)
    const href = getNotificationHref(notification)
    if (href !== pathname) router.push(href)
  }

  const handleMarkAllNotificationsRead = async () => {
    await markAllRead()
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

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && searchResults.length) {
      event.preventDefault()
      setIsSearchOpen(true)
      setActiveSearchIndex((current) => (current + 1) % searchResults.length)
    }
    if (event.key === "ArrowUp" && searchResults.length) {
      event.preventDefault()
      setIsSearchOpen(true)
      setActiveSearchIndex((current) => (current - 1 + searchResults.length) % searchResults.length)
    }
    if (event.key === "Enter" && searchResults[activeSearchIndex]) {
      event.preventDefault()
      handleSelectResult(searchResults[activeSearchIndex].href)
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
        {subtitle && <p className="mt-1 hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
        <div className={`relative flex items-center ${isSearchExpanded ? "max-sm:static" : ""}`}>
          {isSearchExpanded ? (
            <div
              role="search"
              aria-label="Búsqueda global"
              className="fixed inset-0 z-[60] flex flex-col bg-background p-4 sm:relative sm:inset-auto sm:z-auto sm:block sm:w-64 sm:bg-transparent sm:p-0 lg:w-72"
            >
              <div className="mb-3 flex items-center justify-between sm:hidden">
                <div>
                  <p className="text-base font-semibold text-foreground">Buscar</p>
                  <p className="text-xs text-muted-foreground">Páginas, controles, lotes y usuarios</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Cerrar búsqueda"
                  onClick={() => {
                    setSearchTerm("")
                    setIsSearchOpen(false)
                    setIsSearchExpanded(false)
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
                <Input
                  ref={searchInputRef}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={isSearchOpen && Boolean(searchTerm.trim())}
                  aria-controls="global-search-results"
                  aria-activedescendant={searchResults[activeSearchIndex] ? `global-search-option-${activeSearchIndex}` : undefined}
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value)
                    setIsSearchOpen(true)
                    setActiveSearchIndex(0)
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setIsSearchOpen(false)
                      if (!searchTerm.trim() && window.matchMedia("(min-width: 640px)").matches) {
                        setIsSearchExpanded(false)
                      }
                    }, 120)
                  }}
                  onKeyDown={handleSearchKeyDown}
                  className="h-11 border-border/80 bg-card pl-9 sm:h-9"
                />
              </div>

              {isSearchOpen && searchTerm.trim() && (
                <div
                  id="global-search-results"
                  role="listbox"
                  className="elevation-2 absolute inset-x-4 bottom-4 top-[5.25rem] z-50 overflow-hidden rounded-lg border border-border/80 bg-popover sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[min(22rem,calc(100vw-2rem))]"
                >
                  {searchResults.length > 0 ? (
                    <div className="h-full overflow-y-auto py-1 sm:max-h-96">
                      {searchResults.map((result, index) => (
                        <button
                          id={`global-search-option-${index}`}
                          role="option"
                          aria-selected={index === activeSearchIndex}
                          key={`${result.type}-${result.href}-${result.title}-${index}`}
                          type="button"
                          className={`flex min-h-14 w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-secondary/80 focus:bg-secondary/80 focus:outline-none ${index === activeSearchIndex ? "bg-secondary/80" : ""}`}
                          onMouseEnter={() => setActiveSearchIndex(index)}
                          onMouseDown={(event) => {
                            event.preventDefault()
                            handleSelectResult(result.href)
                          }}
                        >
                          <span className="mt-0.5 rounded-md border border-border/70 bg-secondary px-2 py-0.5 text-xs font-bold uppercase tracking-normal text-muted-foreground">
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

              {!searchTerm.trim() && (
                <div className="mt-10 flex flex-1 flex-col items-center justify-center text-center sm:hidden">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
                    <Search className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">Encuentra cualquier elemento</p>
                  <p className="mt-1 max-w-64 text-xs text-muted-foreground">Escribe un nombre, código, ciclo o estado.</p>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground sm:w-auto sm:px-3"
              aria-label="Abrir búsqueda"
              onClick={() => {
                setIsSearchExpanded(true)
                setIsSearchOpen(true)
              }}
            >
              <Search className="h-5 w-5" />
              <span className="hidden lg:inline">Buscar</span>
            </Button>
          )}
        </div>

        {(appUser?.role === "auditor" || appUser?.role === "supervisor") && <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/60 bg-status-danger-solid text-xs font-bold text-destructive-foreground shadow-none">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-1.5rem)] max-w-80">
            <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length > 0 ? (
              <>
                {notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex cursor-pointer flex-col items-start gap-1 py-3"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex w-full items-center gap-2">
                      {!notification.leida && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      <span className="text-sm font-medium">{notification.titulo}</span>
                    </div>
                    <span className="line-clamp-2 pl-4 text-xs text-muted-foreground">
                      {notification.mensaje}
                    </span>
                  </DropdownMenuItem>
                ))}
                {unreadCount > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer justify-center text-primary" onClick={handleMarkAllNotificationsRead}>
                      Marcar todas como leídas
                    </DropdownMenuItem>
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center px-5 py-8 text-center">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
                  <BellOff className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-foreground">Sin notificaciones</p>
                <p className="mt-1 text-xs text-muted-foreground">Cuando haya novedades, aparecerán aquí.</p>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>}

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
                  <SafeImage src={appUser.avatar} alt={userName} className="h-full w-full object-cover" />
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
                  <SafeImage src={appUser.avatar} alt={userName} className="h-full w-full object-cover" />
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
            {appUser?.role !== "ceo" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/preferencias" className="cursor-pointer">
                    <Settings2 className="mr-2 h-4 w-4" />
                    Preferencias
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-status-danger-text focus:text-status-danger-text" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  )
}

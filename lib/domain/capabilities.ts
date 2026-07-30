// Matriz central de navegación por rol. RLS y las APIs mantienen la autorización
// efectiva sobre los datos aunque una ruta no se muestre en la interfaz.
import type { AppRole } from "@/lib/domain/permissions"

type AppCapability =
  | "dashboard:view"
  | "planning:view"
  | "evaluations:view"
  | "scores:view"
  | "models:view"
  | "settings:view"
  | "preferences:view"

const CAPABILITIES_BY_ROLE: Record<AppRole, ReadonlySet<AppCapability>> = {
  admin: new Set(["dashboard:view", "planning:view", "evaluations:view", "scores:view", "models:view", "settings:view", "preferences:view"]),
  supervisor: new Set(["dashboard:view", "planning:view", "evaluations:view", "scores:view", "models:view", "settings:view", "preferences:view"]),
  auditor: new Set(["dashboard:view", "planning:view", "evaluations:view", "scores:view", "preferences:view"]),
  ceo: new Set(["dashboard:view", "evaluations:view"]),
}

const APP_ROUTES = [
  { href: "/", title: "Dashboard", subtitle: "Vista general del sistema de auditorías", capability: "dashboard:view" },
  { href: "/modelos", title: "Modelos de Control", subtitle: "Gestión de metodologías de auditoría", capability: "models:view" },
  { href: "/planificacion", title: "Planificación", subtitle: "Gestión de lotes y auditorías", capability: "planning:view" },
  { href: "/evaluaciones", title: "Evaluaciones", subtitle: "Ejecución y seguimiento de auditorías", capability: "evaluations:view" },
  { href: "/calificaciones", title: "Calificaciones", subtitle: "Resultados por unidad de negocio", capability: "scores:view" },
  { href: "/ajustes", title: "Ajustes", subtitle: "Configuración del sistema", capability: "settings:view" },
  { href: "/preferencias", title: "Preferencias", subtitle: "Perfil y seguridad de tu cuenta", capability: "preferences:view" },
] as const satisfies ReadonlyArray<{
  href: string
  title: string
  subtitle: string
  capability: AppCapability
}>

export function hasCapability(role: AppRole | undefined, capability: AppCapability) {
  return role ? CAPABILITIES_BY_ROLE[role].has(capability) : false
}

export function getRouteDefinition(pathname: string) {
  return APP_ROUTES.find((route) => route.href === "/" ? pathname === "/" : pathname.startsWith(route.href))
}

export function canAccessPath(role: AppRole | undefined, pathname: string) {
  const route = getRouteDefinition(pathname)
  return Boolean(route && hasCapability(role, route.capability))
}

export function getAllowedRoutes(role: AppRole | undefined) {
  return APP_ROUTES.filter((route) => hasCapability(role, route.capability))
}

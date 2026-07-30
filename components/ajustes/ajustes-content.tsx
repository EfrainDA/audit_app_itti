"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { ContentSkeleton, ErrorState } from "@/components/ui/async-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BusinessUnitsSettings } from "@/features/settings/components/business-units-settings"
import { CatalogSettings } from "@/features/settings/components/catalog-settings"
import { CyclesSettings } from "@/features/settings/components/cycles-settings"
import { ThresholdsSettings } from "@/features/settings/components/thresholds-settings"
import { UsersSettings } from "@/features/settings/components/users-settings"
import { useAppData } from "@/hooks/use-app-data"
import { isAdmin as hasAdminRole, isManager } from "@/lib/domain/permissions"
import { ArrowLeft, ArrowRight, Boxes, Building2, Calendar, Gauge, Users } from "lucide-react"
import Link from "next/link"

type SettingsSection = "usuarios" | "unidades" | "ciclos" | "umbrales" | "catalogos"

const sectionCards = [
  { id: "usuarios", title: "Usuarios", detail: "Perfiles, roles y accesos", icon: Users, adminOnly: true },
  { id: "unidades", title: "Unidades", detail: "Datos de cada negocio", icon: Building2 },
  { id: "ciclos", title: "Ciclos", detail: "Periodos de evaluación", icon: Calendar },
  { id: "umbrales", title: "Umbrales", detail: "Rangos del semáforo", icon: Gauge },
  { id: "catalogos", title: "Catálogos", detail: "Productos, procesos y otros", icon: Boxes },
] satisfies Array<{ id: SettingsSection; title: string; detail: string; icon: typeof Users; adminOnly?: boolean }>

// Orquestador de Ajustes: cada dominio mantiene su propio formulario y estado.
export function AjustesContent() {
  const { appUser } = useAuth()
  const isAdmin = hasAdminRole(appUser?.role)
  const visibleSections = sectionCards.filter((section) => !section.adminOnly || isAdmin)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {visibleSections.map((section) => (
        <Card key={section.id} variant="interactive" className="overflow-hidden py-0">
          <Link href={`/ajustes/${section.id}`} className="flex h-28 w-full items-center gap-3 px-5 text-left">
                <section.icon className="h-6 w-6 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{section.title}</span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">{section.detail}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </Card>
      ))}
    </div>
  )
}

export function AjustesSectionContent({ section }: { section: SettingsSection }) {
  const { appUser } = useAuth()
  const { data, error, isLoading, refresh } = useAppData({ domains: ["users", "settings"] })
  const isAdmin = hasAdminRole(appUser?.role)
  const canManage = isManager(appUser?.role)
  const definition = sectionCards.find((item) => item.id === section)
  const isAllowed = Boolean(definition) && (!definition?.adminOnly || isAdmin)

  if (!isAllowed) {
    return (
      <Card className="border-border/70 py-0 shadow-none">
        <CardContent className="space-y-4 p-6">
          <p className="font-semibold">Apartado no disponible</p>
          <Button asChild variant="outline"><Link href="/ajustes"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Ajustes</Link></Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" className="px-2"><Link href="/ajustes"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Ajustes</Link></Button>
      {error && <ErrorState description={error} onRetry={() => void refresh()} />}
      {isLoading && !error ? (
        <ContentSkeleton variant="list" label="Cargando ajustes" />
      ) : (
        <>
          {section === "usuarios" && isAdmin && <UsersSettings users={data.users} canManage={isAdmin} onChanged={refresh} />}
          {section === "unidades" && <BusinessUnitsSettings units={data.unidades} canManage={canManage} canDelete={isAdmin} onChanged={refresh} />}
          {section === "ciclos" && <CyclesSettings cycles={data.ciclos} canManage={canManage} onChanged={refresh} />}
          {section === "umbrales" && <ThresholdsSettings thresholds={data.umbrales} canManage={canManage} onChanged={refresh} />}
          {section === "catalogos" && <CatalogSettings items={data.catalogItems} units={data.unidades} canManage={canManage} onChanged={refresh} />}
        </>
      )}
    </div>
  )
}

export type { SettingsSection }

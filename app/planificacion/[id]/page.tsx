"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { MainLayout } from "@/components/layout/main-layout"
import { LoteDetail } from "@/components/planificacion/lote-detail"
import { useAppData } from "@/hooks/use-app-data"
import { formatEstado, getEstadoBadgeColor } from "@/lib/data"
import { cn } from "@/lib/utils"

export default function PlanificacionLotePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { data, isLoading, error, refresh } = useAppData()
  const loteId = Array.isArray(params.id) ? params.id[0] : params.id
  const lote = data.lotes.find((item) => item.id === loteId)
  const unidad = lote ? data.unidades.find((item) => item.id === lote.unidadNegocioId) : null
  const modelo = lote ? data.modelos.find((item) => item.id === lote.modeloControlId) : null
  const loteVerticales = lote ? data.loteVerticales.filter((item) => item.loteId === lote.id) : []
  const completeLoteVerticales = lote && modelo
    ? modelo.verticales.map((modeloVertical, index) => {
        const loteVertical = loteVerticales.find((item) => item.verticalId === modeloVertical.id)

        return loteVertical ?? {
          id: `lv-${lote.id}-${modeloVertical.id}-${index}`,
          loteId: lote.id,
          verticalId: modeloVertical.id,
          controles: [],
        }
      })
    : []
  const totalControles = completeLoteVerticales.reduce((acc, item) => acc + item.controles.length, 0)
  const verticalesConControles = completeLoteVerticales.filter((item) => item.controles.length > 0).length
  const progresoPlanificacion = completeLoteVerticales.length > 0 ? (verticalesConControles / completeLoteVerticales.length) * 100 : 0
  const auditores = lote
    ? lote.auditores
        .map((id) => data.users.find((user) => user.id === id))
        .filter(Boolean)
    : []
  const title = unidad ? unidad.nombre : "Detalle de lote"
  const subtitle = lote ? `Ciclo ${lote.ciclo} - ${lote.año}` : "Planificacion"

  return (
    <MainLayout title={title} subtitle={subtitle}>
      <div className="space-y-4">
        {error && (
          <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {isLoading && (
          <Card className="border-border/70 bg-card">
            <CardContent className="px-4 py-6 text-sm text-muted-foreground">Cargando lote...</CardContent>
          </Card>
        )}

        {!isLoading && !lote && (
          <Card className="border-border/70 bg-card">
            <CardContent className="space-y-3 px-4 py-6">
              <p className="font-semibold">Lote no encontrado</p>
              <p className="text-sm text-muted-foreground">No se encontro un lote con el identificador solicitado.</p>
            </CardContent>
          </Card>
        )}

        {lote && (
          <>
            <Card className="border-border/70 bg-card">
              <CardContent className="grid gap-4 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
                <div className="min-w-0 space-y-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-secondary/35">
                      {unidad?.logo ? (
                        <img src={unidad.logo} alt={unidad.nombre} className="h-full w-full object-contain p-1.5" />
                      ) : (
                        <Building2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex min-h-12 min-w-0 items-center">
                      <p className="truncate text-2xl font-semibold leading-none tracking-tight text-foreground">{unidad?.nombre ?? "N/A"}</p>
                    </div>
                  </div>

                  <div className="grid gap-1.5 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 font-semibold text-foreground">Estado:</span>
                      <Badge className={cn("h-5 rounded-full px-2 text-[10px] font-semibold", getEstadoBadgeColor(lote.estado))}>
                        {formatEstado(lote.estado)}
                      </Badge>
                    </div>
                    <div className="flex min-w-0 gap-2">
                      <span className="shrink-0 font-semibold text-foreground">Ciclo de Control:</span>
                      <span className="truncate text-muted-foreground">{lote.ciclo} - {lote.año}</span>
                    </div>
                    <div className="flex min-w-0 gap-2">
                      <span className="shrink-0 font-semibold text-foreground">Modelo Aplicado:</span>
                      <span className="truncate text-muted-foreground">{modelo?.nombre ?? "N/A"}</span>
                    </div>
                    <div className="flex min-w-0 gap-2">
                      <span className="shrink-0 font-semibold text-foreground">Detalle del Modelo:</span>
                      <span className="truncate text-muted-foreground">{completeLoteVerticales.length} verticales</span>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-52 space-y-2 lg:ml-auto">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:text-right">Planificacion</p>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-2xl font-semibold leading-none text-foreground">{totalControles}</span>
                    <span className="text-sm font-medium text-muted-foreground">controles</span>
                  </div>
                  <Progress value={progresoPlanificacion} className="h-2.5" />
                  <p className="text-right text-xs text-muted-foreground">
                    {verticalesConControles}/{completeLoteVerticales.length} verticales con controles
                  </p>
                </div>
              </CardContent>
            </Card>

            <LoteDetail lote={lote} onChanged={refresh} />

            <div className="flex justify-start pt-1">
              <Button variant="outline" onClick={() => router.push("/planificacion")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}

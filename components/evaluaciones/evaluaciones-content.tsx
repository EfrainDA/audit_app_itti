"use client"

/* eslint-disable @typescript-eslint/no-unused-vars */

// Listado que combina lotes, verticales, controles y respuestas para filtrar resultados.
import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RealisticIcon } from "@/components/ui/realistic-icon"
import { EmptyState } from "@/components/ui/async-state"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  Filter,
  Search,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  type Control,
  type Lote,
  type LoteVertical,
  getScoreColor,
  getEstadoBadgeColor,
  formatEstado,
  isCountableLote,
  getControlDisplayEstado,
} from "@/lib/data"
import { useAppData } from "@/hooks/use-app-data"
import { fetchAnswersForControl } from "@/lib/repositories/supabase/evaluations"
import { getErrorMessage } from "@/lib/error-message"
import { downloadPptx, downloadXlsx } from "@/lib/export"
import {
  controlMatchesFilters,
  getCompleteLotVerticals,
  matchesControlStatus,
} from "@/features/evaluations/domain/evaluation-list"

const YEAR_KEY = "a\u00f1o"

interface LoteConDatos extends Lote {
  unidadNombre: string
  unidadLogo?: string
  modeloNombre: string
  auditoresNombres: string
  loteVerticales: LoteVertical[]
  calificacionFinal: number | null
  verticalResultados: VerticalResultado[]
}

interface VerticalResultado {
  id: string
  nombre: string
  peso: number
  controlesTotal: number
  controlesConScore: number
  scorePromedio: number | null
  aporte: number | null
}

interface EvaluacionesContentProps {
  view?: "evaluaciones" | "calificaciones"
}

// Renderiza el modo operativo o de calificaciones según la vista solicitada.
import { useEvaluacionesContentController } from "./use-evaluaciones-content-controller"
export function EvaluacionesContent({ view = "evaluaciones" }: EvaluacionesContentProps) {
  const controller = useEvaluacionesContentController({ view })
  if (!("data" in controller)) return controller
  const { data, isLoading, dataError, lotes, unidades, users, modelos, loteVerticalesData, answeredControlIds, searchTerm, setSearchTerm, filterEstado, setFilterEstado, loteEstadoFilter, setLoteEstadoFilter, isExportOpen, setIsExportOpen, exportLoteId, setExportLoteId, exportFormat, setExportFormat, isExporting, setIsExporting, exportError, setExportError, calificacionesCycleFilter, setCalificacionesCycleFilter, lotesConDatos, calificacionesCycleOptions, defaultCalificacionesCycleKey, selectedCalificacionesCycleKey, lotesCalificacionesFiltrados, controles, controlesLotesAbiertos, normalizedSearchTerm, hasActiveControlFilters, lotesFiltrados, stats, exportSelectedLote } = controller
return (
    <div className="space-y-4">
      {view === "evaluaciones" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card variant="surface" className="h-20 gap-0 py-0">
            <CardContent className="flex h-full items-center gap-3 px-4 py-0">
              <RealisticIcon icon={ClipboardCheck} tone="primary" size="md" />
              <div>
                <p className="text-3xl font-semibold leading-none tracking-tight">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Controles</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="surface" className="h-20 gap-0 py-0">
            <CardContent className="flex h-full items-center gap-3 px-4 py-0">
              <RealisticIcon icon={AlertCircle} tone="neutral" size="md" />
              <div>
                <p className="text-3xl font-semibold leading-none tracking-tight">{stats.pendientes}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="surface" className="h-20 gap-0 py-0">
            <CardContent className="flex h-full items-center gap-3 px-4 py-0">
              <RealisticIcon icon={Clock} tone="primary" size="md" />
              <div>
                <p className="text-3xl font-semibold leading-none tracking-tight">{stats.enCurso}</p>
                <p className="text-xs text-muted-foreground">En Curso</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="surface" className="h-20 gap-0 py-0">
            <CardContent className="flex h-full items-center gap-3 px-4 py-0">
              <RealisticIcon icon={CheckCircle2} tone="success" size="md" />
              <div>
                <p className="text-3xl font-semibold leading-none tracking-tight">{stats.terminados}</p>
                <p className="text-xs text-muted-foreground">Terminados</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {view === "evaluaciones" && (
        <>
      <div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center">
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-fit lg:grid-cols-[280px_150px_220px]">
          <div className="relative w-full lg:w-[280px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por lote, unidad, control o proceso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-border/70 bg-card/70 pl-9"
            />
          </div>
          <Select value={loteEstadoFilter} onValueChange={setLoteEstadoFilter}>
            <SelectTrigger className="w-full border-border/70 bg-card/70 lg:w-[150px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Lote" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="abierto">Abiertos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cerrado">Cerrados</SelectItem>
              <SelectItem value="deprecado">Dados de baja</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-full border-border/70 bg-card/70 lg:w-[220px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Control" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los controles</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="en_curso">En Curso</SelectItem>
              <SelectItem value="terminado">Terminados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog
          open={isExportOpen}
          onOpenChange={(open) => {
            setIsExportOpen(open)
            if (!open) setExportError(null)
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full lg:ml-auto lg:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </DialogTrigger>
          <DialogContent className="!w-[calc(100vw-2rem)] !max-w-[26rem] gap-4 p-5 sm:!w-[26rem] sm:!max-w-[26rem] lg:!max-w-[26rem] lg:p-5">
            <DialogHeader>
              <DialogTitle>Exportar informe</DialogTitle>
              <DialogDescription>Selecciona el lote que quieres exportar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <Select value={exportLoteId} onValueChange={setExportLoteId}>
                <SelectTrigger className="w-full border-border/70 bg-card/70">
                  <SelectValue placeholder="Seleccionar lote" />
                </SelectTrigger>
                <SelectContent>
                  {lotesConDatos.map((lote) => (
                    <SelectItem key={lote.id} value={lote.id}>
                      <p className="mt-1 text-sm font-semibold">Ciclo {lote.ciclo} - {lote[YEAR_KEY]}</p>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as typeof exportFormat)}>
                <SelectTrigger className="w-full border-border/70 bg-card/70">
                  <SelectValue placeholder="Formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="presentation">Presentacion</SelectItem>
                </SelectContent>
              </Select>
              {exportError && <p className="text-sm text-status-danger-text">{exportError}</p>}
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setIsExportOpen(false)} disabled={isExporting}>
                  Cancelar
                </Button>
                <Button onClick={exportSelectedLote} disabled={!exportLoteId || isExporting}>
                  {isExporting ? "Exportando..." : "Exportar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
        </>
      )}

      {view === "calificaciones" && (
      <Card className="border-border/70 bg-card py-0">
        <CardHeader className="items-start gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-start">
          <CardTitle className="text-base">Calificacion por Unidad de Negocio</CardTitle>
          <Select value={calificacionesCycleFilter} onValueChange={setCalificacionesCycleFilter}>
            <SelectTrigger className="h-9 w-full bg-card sm:w-[220px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filtrar ciclo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Ciclo vigente</SelectItem>
              <SelectItem value="all">Todos los ciclos</SelectItem>
              {calificacionesCycleOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  Ciclo {option.cycle} - {option.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-4 py-3">
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  La calificación final se calcula con el aporte de cada vertical según su peso dentro del modelo de control.
          </p>
          <Accordion type="multiple" className="space-y-3">
            {lotesCalificacionesFiltrados.map((lote) => (
              <AccordionItem key={lote.id} value={`calificacion-${lote.id}`} className="overflow-hidden rounded-lg border border-border/70 bg-card">
                <AccordionTrigger className="px-4 py-3 hover:bg-muted/25 hover:no-underline">
                  <div className="grid min-w-0 w-full grid-cols-1 gap-3 pr-2 text-left lg:grid-cols-[minmax(0,1.35fr)_10rem_minmax(0,1fr)_8rem] lg:items-center lg:pr-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-background">
                        {lote.unidadLogo ? (
                          <Image src={lote.unidadLogo} alt={lote.unidadNombre} width={48} height={28} className="h-full w-full object-contain" />
                        ) : (
                          <Building2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{lote.unidadNombre}</p>
                        <p className="truncate text-xs text-muted-foreground">{lote.modeloNombre}</p>
                      </div>
                    </div>
                    <div className="rounded-md border border-border/60 bg-background px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ciclo</p>
                      <p className="mt-1 text-sm font-semibold">Ciclo {lote.ciclo} - {lote[YEAR_KEY]}</p>
                    </div>
                    <div className="min-w-0 rounded-md border border-border/60 bg-background px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Auditores</p>
                      <p className="mt-1 truncate text-sm font-medium">{lote.auditoresNombres || "Sin auditores"}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-left lg:text-right">
                      <p className={`text-xl font-semibold leading-none ${lote.calificacionFinal !== null ? getScoreColor(lote.calificacionFinal) : "text-muted-foreground"}`}>
                        {lote.calificacionFinal !== null ? `${lote.calificacionFinal}%` : "-"}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Final</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="overflow-hidden rounded-lg border border-border/60">
                    <div className="grid grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] gap-3 border-b border-border/60 bg-muted/25 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Vertical</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Peso</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Controles</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Aporte</p>
                    </div>
                    <div className="divide-y divide-border/60">
                      {lote.verticalResultados.map((vertical) => (
                        <div key={vertical.id} className="grid grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] gap-3 px-3 py-3">
                          <p className="truncate text-sm font-semibold">{vertical.nombre}</p>
                          <p className="text-sm font-semibold">{vertical.peso}%</p>
                          <p className="text-sm font-semibold">{vertical.controlesConScore}/{vertical.controlesTotal}</p>
                          <p className={`text-sm font-semibold ${vertical.aporte !== null ? getScoreColor(vertical.aporte) : "text-muted-foreground"}`}>
                            {vertical.aporte !== null ? `${vertical.aporte}%` : "-"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {lotesCalificacionesFiltrados.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/70 p-8 text-center">
              <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No hay calificaciones para este ciclo</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cambia el filtro para consultar ciclos anteriores o todos los ciclos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {view === "evaluaciones" && (
        <>
      <div className="space-y-3">
        {lotesFiltrados.map((lote) => {
          const totalControles = lote.loteVerticales.reduce((acc, lv) => acc + lv.controles.length, 0)
          const terminados = lote.loteVerticales.reduce((acc, lv) => acc + lv.controles.filter((c) => c.estado === "terminado").length, 0)

          return (
            <Link key={lote.id} href={`/evaluaciones/${lote.id}`} className="block">
              <Card variant="interactive" className="min-w-0 overflow-hidden">
                <CardContent className="px-3 py-3 sm:px-4">
                <div className="grid min-w-0 w-full grid-cols-1 gap-3 text-left md:grid-cols-[1.35fr_0.8fr_1fr_auto] md:items-center">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-7 w-12 shrink-0 items-center justify-center overflow-hidden rounded">
                      {lote.unidadLogo ? (
                        <Image
                          src={lote.unidadLogo}
                          alt={lote.unidadNombre}
                          width={48}
                          height={28}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded border border-primary/20 bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{lote.unidadNombre}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lote.modeloNombre}
                      </p>
                    </div>
                  </div>
                      <p className="mt-1 text-sm font-semibold">Ciclo {lote.ciclo} - {lote[YEAR_KEY]}</p>
                  <p className="truncate text-sm text-muted-foreground">{lote.auditoresNombres || "Sin auditores"}</p>
                  <div className="flex items-center gap-3 md:justify-end">
                    <Badge className={getEstadoBadgeColor(lote.estado)}>{formatEstado(lote.estado)}</Badge>
                    <div className="min-w-[72px] text-right">
                      <p className="text-sm font-semibold">{terminados}/{totalControles}</p>
                      <p className="text-xs text-muted-foreground">Controles</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {lotesFiltrados.length === 0 && (
        <EmptyState
          icon={ClipboardCheck}
          title={hasActiveControlFilters ? "Sin resultados para estos filtros" : "Aún no hay evaluaciones"}
          description={hasActiveControlFilters
            ? "Ajusta o limpia los filtros para volver a ver evaluaciones."
            : "Agrega controles a las verticales desde Planificación para comenzar."}
          action={
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/planificacion">Ir a Planificación</Link>
            </Button>
          }
        />
      )}
        </>
      )}
    </div>
  )
}

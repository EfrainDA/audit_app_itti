"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  Filter,
  Play,
  Search,
  User,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  mockLotes,
  mockUnidades,
  mockUsers,
  mockModelos,
  mockLoteVerticales,
  type Control,
  type Lote,
  type LoteVertical,
  getScoreColor,
  getScoreBgColor,
  getEstadoBadgeColor,
  formatEstado,
} from "@/lib/data"

interface LoteConDatos extends Lote {
  unidadNombre: string
  modeloNombre: string
  auditoresNombres: string
  loteVerticales: LoteVertical[]
}

function getLoteVerticalesCompletas(lote: Lote): LoteVertical[] {
  const existentes = mockLoteVerticales.filter((lv) => lv.loteId === lote.id)
  const modelo = mockModelos.find((m) => m.id === lote.modeloControlId)

  return modelo?.verticales.map((vertical, index) => {
    const existente = existentes.find((lv) => lv.verticalId === vertical.id)
    return existente ?? {
      id: `lv-${lote.id}-${vertical.id}-${index}`,
      loteId: lote.id,
      verticalId: vertical.id,
      controles: [],
    }
  }) ?? existentes
}

function controlMatches(control: Control, searchTerm: string, filterEstado: string) {
  const normalized = searchTerm.toLowerCase()
  const matchesSearch =
    control.identificador.toLowerCase().includes(normalized) ||
    (control.proceso || "").toLowerCase().includes(normalized) ||
    (control.subproceso || "").toLowerCase().includes(normalized)

  const matchesEstado = filterEstado === "all" || control.estado === filterEstado
  return matchesSearch && matchesEstado
}

export function EvaluacionesContent() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("all")

  const lotesConDatos = useMemo<LoteConDatos[]>(() => {
    return mockLotes.map((lote) => {
      const unidad = mockUnidades.find((u) => u.id === lote.unidadNegocioId)
      const modelo = mockModelos.find((m) => m.id === lote.modeloControlId)
      const auditores = lote.auditores.map((id) => mockUsers.find((u) => u.id === id)).filter(Boolean)

      return {
        ...lote,
        unidadNombre: unidad?.nombre || "N/A",
        modeloNombre: modelo?.nombre || "N/A",
        auditoresNombres: auditores.map((auditor) => auditor?.name).join(", "),
        loteVerticales: getLoteVerticalesCompletas(lote),
      }
    })
  }, [])

  const controles = lotesConDatos.flatMap((lote) => lote.loteVerticales.flatMap((lv) => lv.controles))

  const lotesFiltrados = lotesConDatos
    .map((lote) => {
      const loteCoincide =
        lote.unidadNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lote.modeloNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `ciclo ${lote.ciclo}`.includes(searchTerm.toLowerCase())

      return {
        ...lote,
        loteVerticales: lote.loteVerticales.map((lv) => ({
          ...lv,
          controles: loteCoincide
            ? lv.controles.filter((control) => filterEstado === "all" || control.estado === filterEstado)
            : lv.controles.filter((control) => controlMatches(control, searchTerm, filterEstado)),
        })),
        loteCoincide,
      }
    })
    .filter((lote) => lote.loteCoincide || lote.loteVerticales.some((lv) => lv.controles.length > 0))

  const stats = {
    total: controles.length,
    pendientes: controles.filter((c) => c.estado === "pendiente").length,
    enCurso: controles.filter((c) => c.estado === "en_curso").length,
    terminados: controles.filter((c) => c.estado === "terminado").length,
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border-border/70 bg-card/80">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Controles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg border border-border/70 bg-muted p-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.pendientes}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.enCurso}</p>
              <p className="text-xs text-muted-foreground">En Curso</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg border border-success/20 bg-success/10 p-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.terminados}</p>
              <p className="text-xs text-muted-foreground">Terminados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por lote, unidad, control o proceso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-border bg-secondary/70 pl-9"
          />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[190px] border-border bg-secondary/70">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="en_curso">En Curso</SelectItem>
            <SelectItem value="terminado">Terminados</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={lotesFiltrados.map((lote) => lote.id)} className="space-y-4">
        {lotesFiltrados.map((lote) => {
          const totalControles = lote.loteVerticales.reduce((acc, lv) => acc + lv.controles.length, 0)
          const terminados = lote.loteVerticales.reduce((acc, lv) => acc + lv.controles.filter((c) => c.estado === "terminado").length, 0)

          return (
            <AccordionItem key={lote.id} value={lote.id} className="overflow-hidden rounded-lg border border-border/70 bg-card/80">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-secondary/35">
                <div className="flex w-full flex-col gap-3 pr-4 text-left lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{lote.unidadNombre}</p>
                      <p className="text-sm text-muted-foreground">
                        {lote.modeloNombre} | Ciclo {lote.ciclo} - {lote.año}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        {lote.auditoresNombres || "Sin auditores asignados"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={getEstadoBadgeColor(lote.estado)}>{formatEstado(lote.estado)}</Badge>
                    <div className="rounded-md border border-border/70 bg-background/25 px-3 py-2 text-right">
                      <p className="text-xs text-muted-foreground">Controles</p>
                      <p className="font-semibold">{terminados}/{totalControles}</p>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <Accordion type="multiple" defaultValue={lote.loteVerticales.map((lv) => lv.id)} className="space-y-3">
                  {lote.loteVerticales.map((loteVertical) => {
                    const modelo = mockModelos.find((m) => m.id === lote.modeloControlId)
                    const vertical = modelo?.verticales.find((v) => v.id === loteVertical.verticalId)
                    if (!vertical) return null

                    const controlesTerminados = loteVertical.controles.filter((c) => c.estado === "terminado").length
                    const controlesTotal = loteVertical.controles.length
                    const controlesConScore = loteVertical.controles.filter((c) => c.scoreControl !== undefined)
                    const scorePromedio = controlesConScore.length
                      ? Math.round(controlesConScore.reduce((acc, control) => acc + (control.scoreControl || 0), 0) / controlesConScore.length)
                      : null

                    return (
                      <AccordionItem key={loteVertical.id} value={loteVertical.id} className="overflow-hidden rounded-lg border border-border/60 bg-background/25">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/30">
                          <div className="flex w-full flex-col gap-3 pr-4 text-left md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-14 items-center justify-center rounded-lg border border-accent/20 bg-accent/10">
                                <span className="text-sm font-semibold text-accent">{vertical.peso}%</span>
                              </div>
                              <div>
                                <p className="font-medium">{vertical.nombre}</p>
                                <p className="text-xs text-muted-foreground">{vertical.parametros.length} parametros configurados</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Controles</p>
                                <p className="font-medium">{controlesTerminados}/{controlesTotal}</p>
                              </div>
                              {scorePromedio !== null && (
                                <div className="flex flex-col items-end gap-1">
                                  <div className={`min-w-[64px] rounded-md px-2 py-1 text-center ${getScoreBgColor(scorePromedio)}`}>
                                    <p className={`font-semibold ${getScoreColor(scorePromedio)}`}>
                                      {((scorePromedio / 100) * vertical.peso).toFixed(1)}%
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          {loteVertical.controles.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border/70 py-6 text-center text-sm text-muted-foreground">
                              No hay controles para esta vertical con los filtros actuales.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {loteVertical.controles.map((control) => {
                                const auditor = control.auditorId ? mockUsers.find((u) => u.id === control.auditorId) : null
                                return (
                                  <Card key={control.id} className="border-border/60 bg-card/70">
                                    <CardContent className="p-3">
                                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                          <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-sm font-semibold">{control.identificador}</span>
                                            <Badge className={getEstadoBadgeColor(control.estado)}>{formatEstado(control.estado)}</Badge>
                                            {control.scoreControl !== undefined && (
                                              <span className={`text-sm font-semibold ${getScoreColor(control.scoreControl)}`}>{control.scoreControl}</span>
                                            )}
                                          </div>
                                          <p className="text-sm text-muted-foreground">
                                            {control.proceso || "Sin proceso"}
                                            {control.subproceso && ` / ${control.subproceso}`}
                                            {auditor && ` | Auditor: ${auditor.name}`}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {control.estado === "terminado" ? (
                                            <Button variant="outline" size="sm" asChild>
                                              <Link href={`/evaluaciones/${control.id}`}>
                                                <Eye className="mr-1 h-4 w-4" />
                                                Ver
                                              </Link>
                                            </Button>
                                          ) : (
                                            <Button size="sm" asChild>
                                              <Link href={`/evaluaciones/${control.id}`}>
                                                <Play className="mr-1 h-4 w-4" />
                                                Evaluar
                                              </Link>
                                            </Button>
                                          )}
                                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )
                              })}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {lotesFiltrados.length === 0 && (
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-medium">No se encontraron lotes o controles</h3>
            <p className="text-sm text-muted-foreground">
              Ajusta los filtros de busqueda o ve a Planificacion para agregar controles a las verticales.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/planificacion">Ir a Planificacion</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

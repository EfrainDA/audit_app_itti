"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RealisticIcon } from "@/components/ui/realistic-icon"
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
  type Control,
  type Lote,
  type LoteVertical,
  getScoreColor,
  getScoreBgColor,
  getEstadoBadgeColor,
  formatEstado,
} from "@/lib/data"
import { useAppData } from "@/hooks/use-app-data"
import { downloadCsv } from "@/lib/export"

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

function getLoteVerticalesCompletas(lote: Lote, loteVerticalesData: LoteVertical[], modelos: ReturnType<typeof useAppData>["data"]["modelos"]): LoteVertical[] {
  const existentes = loteVerticalesData.filter((lv) => lv.loteId === lote.id)
  const modelo = modelos.find((m) => m.id === lote.modeloControlId)

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
  const { data } = useAppData()
  const lotes = data.lotes
  const unidades = data.unidades
  const users = data.users
  const modelos = data.modelos
  const loteVerticalesData = data.loteVerticales
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [activeView, setActiveView] = useState("evaluaciones")

  const lotesConDatos = useMemo<LoteConDatos[]>(() => {
    return lotes.map((lote) => {
      const unidad = unidades.find((u) => u.id === lote.unidadNegocioId)
      const modelo = modelos.find((m) => m.id === lote.modeloControlId)
      const auditores = lote.auditores.map((id) => users.find((u) => u.id === id)).filter(Boolean)
      const loteVerticales = getLoteVerticalesCompletas(lote, loteVerticalesData, modelos)
      const verticalResultados = loteVerticales.map((loteVertical) => {
        const vertical = modelo?.verticales.find((v) => v.id === loteVertical.verticalId)
        const controlesConScore = loteVertical.controles.filter((control) => control.scoreControl !== undefined)
        const scorePromedio = controlesConScore.length
          ? controlesConScore.reduce((acc, control) => acc + (control.scoreControl ?? 0), 0) / controlesConScore.length
          : null

        return {
          id: loteVertical.id,
          nombre: vertical?.nombre || "Vertical sin configurar",
          peso: vertical?.peso || 0,
          controlesTotal: loteVertical.controles.length,
          controlesConScore: controlesConScore.length,
          scorePromedio,
          aporte: scorePromedio !== null && vertical ? Number(((scorePromedio * vertical.peso) / 100).toFixed(1)) : null,
        }
      })
      const aportes = verticalResultados
        .map((vertical) => vertical.aporte)
        .filter((aporte): aporte is number => aporte !== null)

      return {
        ...lote,
        unidadNombre: unidad?.nombre || "N/A",
        unidadLogo: unidad?.logo,
        modeloNombre: modelo?.nombre || "N/A",
        auditoresNombres: auditores.map((auditor) => auditor?.name).join(", "),
        loteVerticales,
        calificacionFinal: aportes.length ? Number(aportes.reduce((acc, aporte) => acc + aporte, 0).toFixed(1)) : null,
        verticalResultados,
      }
    })
  }, [loteVerticalesData, lotes, modelos, unidades, users])

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

  const exportEvaluaciones = () => {
    downloadCsv(
      "evaluaciones-controles.csv",
      lotesConDatos.flatMap((lote) =>
        lote.loteVerticales.flatMap((loteVertical) =>
          loteVertical.controles.map((control) => ({
            unidad: lote.unidadNombre,
            modelo: lote.modeloNombre,
            ciclo: lote.ciclo,
            año: lote.año,
            control: control.identificador,
            proceso: control.proceso ?? "",
            subproceso: control.subproceso ?? "",
            estado: control.estado,
            score: control.scoreControl ?? "",
          })),
        ),
      ),
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="h-24 gap-0 border-primary/15 bg-card py-0 dark:border-primary/25">
          <CardContent className="flex h-full items-center gap-3 px-4 py-0">
            <RealisticIcon icon={ClipboardCheck} tone="primary" size="md" />
            <div>
              <p className="text-2xl font-semibold leading-none tracking-tight">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Controles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="h-24 gap-0 border-border/70 bg-card py-0 dark:border-primary/18">
          <CardContent className="flex h-full items-center gap-3 px-4 py-0">
            <RealisticIcon icon={AlertCircle} tone="neutral" size="md" />
            <div>
              <p className="text-2xl font-semibold leading-none tracking-tight">{stats.pendientes}</p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="h-24 gap-0 border-primary/15 bg-card py-0 dark:border-primary/25">
          <CardContent className="flex h-full items-center gap-3 px-4 py-0">
            <RealisticIcon icon={Clock} tone="primary" size="md" />
            <div>
              <p className="text-2xl font-semibold leading-none tracking-tight">{stats.enCurso}</p>
              <p className="text-sm text-muted-foreground">En Curso</p>
            </div>
          </CardContent>
        </Card>
        <Card className="h-24 gap-0 border-success/15 bg-card py-0 dark:border-success/25">
          <CardContent className="flex h-full items-center gap-3 px-4 py-0">
            <RealisticIcon icon={CheckCircle2} tone="success" size="md" />
            <div>
              <p className="text-2xl font-semibold leading-none tracking-tight">{stats.terminados}</p>
              <p className="text-sm text-muted-foreground">Terminados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="w-full bg-secondary sm:w-fit">
          <TabsTrigger value="evaluaciones">Evaluaciones</TabsTrigger>
          <TabsTrigger value="calificaciones">Calificaciones</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeView === "evaluaciones" && (
        <>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative w-full max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por lote, unidad, control o proceso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-border bg-secondary/70 pl-9"
          />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-full border-border bg-secondary/70 sm:w-[190px]">
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
        <Button variant="outline" className="w-full sm:w-auto" onClick={exportEvaluaciones}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>
        </>
      )}

      {activeView === "calificaciones" && (
      <Card className="border-border/70 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Calificacion por Unidad de Negocio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            La calificacion final se calcula con el aporte de cada vertical segun su peso dentro del modelo de control.
          </p>
          <Accordion type="multiple" className="space-y-3">
            {lotesConDatos.map((lote) => (
              <AccordionItem key={lote.id} value={`calificacion-${lote.id}`} className="overflow-hidden rounded-lg border border-border/60 bg-background">
                <AccordionTrigger className="px-3 py-3 hover:bg-secondary/35 hover:no-underline sm:px-4">
                  <div className="grid min-w-0 w-full grid-cols-1 gap-3 pr-2 text-left md:grid-cols-[1.4fr_0.8fr_1fr_0.8fr] md:items-center md:pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 overflow-hidden rounded">
                        {lote.unidadLogo ? (
                          <Image src={lote.unidadLogo} alt={lote.unidadNombre} width={28} height={28} className="object-contain" />
                        ) : (
                          <Building2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{lote.unidadNombre}</p>
                        <p className="text-xs text-muted-foreground">{lote.modeloNombre}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">Ciclo {lote.ciclo} - {lote.año}</p>
                    <p className="truncate text-sm text-muted-foreground">{lote.auditoresNombres || "Sin auditores"}</p>
                    <div className="text-left md:text-right">
                      <p className={`text-lg font-semibold ${lote.calificacionFinal !== null ? getScoreColor(lote.calificacionFinal) : "text-muted-foreground"}`}>
                        {lote.calificacionFinal !== null ? `${lote.calificacionFinal}%` : "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">Calificacion final</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="overflow-x-auto rounded-lg border border-border/60">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr className="border-b border-border bg-secondary/45">
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Vertical</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Peso</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Promedio logrado</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Controles</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Aporte final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lote.verticalResultados.map((vertical) => (
                          <tr key={vertical.id} className="border-b border-border/60 last:border-0">
                            <td className="px-4 py-3 text-sm font-medium">{vertical.nombre}</td>
                            <td className="px-4 py-3 text-right text-sm">{vertical.peso}%</td>
                            <td className="px-4 py-3 text-right text-sm">
                              {vertical.scorePromedio !== null ? vertical.scorePromedio.toFixed(1) : "-"}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                              {vertical.controlesConScore}/{vertical.controlesTotal}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold">
                              {vertical.aporte !== null ? `${vertical.aporte}%` : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      )}

      {activeView === "evaluaciones" && (
        <>
      <Accordion type="multiple" defaultValue={lotesFiltrados.map((lote) => lote.id)} className="space-y-4">
        {lotesFiltrados.map((lote) => {
          const totalControles = lote.loteVerticales.reduce((acc, lv) => acc + lv.controles.length, 0)
          const terminados = lote.loteVerticales.reduce((acc, lv) => acc + lv.controles.filter((c) => c.estado === "terminado").length, 0)

          return (
            <AccordionItem key={lote.id} value={lote.id} className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
              <AccordionTrigger className="px-3 py-4 hover:no-underline hover:bg-secondary/35 sm:px-5">
                <div className="flex min-w-0 w-full flex-col gap-3 pr-2 text-left lg:flex-row lg:items-center lg:justify-between lg:pr-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg overflow-hidden">
                      {lote.unidadLogo ? (
                        <Image
                          src={lote.unidadLogo}
                          alt={lote.unidadNombre}
                          width={44}
                          height={44}
                          className="object-contain"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full rounded-lg border border-primary/20 bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{lote.unidadNombre}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        Ciclo {lote.ciclo} - {lote.año} | {lote.modeloNombre}
                      </p>
                      <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span className="truncate">{lote.auditoresNombres || "Sin auditores asignados"}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={getEstadoBadgeColor(lote.estado)}>{formatEstado(lote.estado)}</Badge>
                    <div className="rounded-md border border-border/70 bg-background px-3 py-2 text-right">
                      <p className="text-xs text-muted-foreground">Controles</p>
                      <p className="font-semibold">{terminados}/{totalControles}</p>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-5 sm:px-5">
                <Accordion type="multiple" defaultValue={lote.loteVerticales.map((lv) => lv.id)} className="space-y-3">
                  {lote.loteVerticales.map((loteVertical) => {
                    const modelo = modelos.find((m) => m.id === lote.modeloControlId)
                    const vertical = modelo?.verticales.find((v) => v.id === loteVertical.verticalId)
                    if (!vertical) return null

                    const controlesTerminados = loteVertical.controles.filter((c) => c.estado === "terminado").length
                    const controlesTotal = loteVertical.controles.length
                    const controlesConScore = loteVertical.controles.filter((c) => c.scoreControl !== undefined)
                    const scorePromedio = controlesConScore.length
                      ? Math.round(controlesConScore.reduce((acc, control) => acc + (control.scoreControl || 0), 0) / controlesConScore.length)
                      : null

                    return (
                      <AccordionItem key={loteVertical.id} value={loteVertical.id} className="overflow-hidden rounded-lg border border-border/60 bg-background">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/30">
                          <div className="flex w-full flex-col gap-3 pr-4 text-left md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-14 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                                <span className="text-sm font-semibold text-primary">{vertical.peso}%</span>
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
                                    <p className="text-[10px] font-medium text-muted-foreground">Logrado</p>
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
                                const auditor = control.auditorId ? users.find((u) => u.id === control.auditorId) : null
                                return (
                                  <Card key={control.id} className="border-border/60 bg-card">
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
        <Card className="border-border/70 bg-card">
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
        </>
      )}
    </div>
  )
}

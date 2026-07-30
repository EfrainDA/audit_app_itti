"use client"
/* eslint-disable @typescript-eslint/no-unused-vars */

// Bloques visuales exclusivos del panel ejecutivo. Reciben datos ya agregados
// para mantener la consulta, los permisos y el cálculo fuera de la presentación.
import { useEffect, useMemo, useState } from "react"import Link from "next/link"import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"import { Badge } from "@/components/ui/badge"import { Button } from "@/components/ui/button"import { SafeImage } from "@/components/ui/safe-image"
import {  Select,  SelectContent,  SelectItem,  SelectTrigger,  SelectValue,} from "@/components/ui/select"import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"import {  Table,  TableBody,  TableCell,  TableHead,  TableHeader,  TableRow,} from "@/components/ui/table"import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Clock,
  Crown,
  Eye,
  Layers,
  Play,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import {
  getEstadoBadgeColor,
  formatEstado,
  isCountableLote,
  type Ciclo,
  type Lote,
  type ModeloControl,
  type Respuesta,
  type Umbral,
  type UnidadNegocio,
} from "@/lib/data"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import {
  getConfiguredScoreThresholds,
  getActiveCycle,
  getCounts,
  getDaysUntil,
  getExecutiveScoreTone,
  getSemaphore,
  getThresholdRangeLabel,
  getThresholdTone,
  type CountMetrics,
} from "@/features/dashboard/domain/metrics"
import { useExecutiveDashboard } from "@/features/dashboard/application/use-executive-dashboard"
import { DashboardCycleFilter } from "@/components/dashboard/dashboard-cycle-filter"

import { DashboardView, ControlContext, StatCard, RoleDashboard, SupervisorVerticalScore, SupervisorLoteSummary, SupervisorAnalystSummary, CeoCycleSummary, LotSummaryIndexes, appendToIndex, buildLotSummary, CeoSemaphoreColumn, CeoComparedCycle, CeoCycleVerticalDetail, getControlCategory, getSummaryControlCategory, getControlProductLabels, getControlProcessLabel, getUniqueNonEmpty, normalizeComparableName, getVerticalGroupKey, areVerticalGroupKeysSimilar, findSimilarVerticalGroupKey, averageUnitScore, formatScore, formatCompactList, getControlDetailLabel, buildCeoCycleVerticalDetails, formatDelta } from "./dashboard-model"

// Resume el resultado global y su variación frente al ciclo anterior.
export function CeoScoreCard({ score, delta, thresholds }: { score: number | null; delta: number | null; thresholds: Umbral[] }) {
  const trendUp = (delta ?? 0) >= 0
  const TrendIcon = trendUp ? ArrowUp : ArrowDown
  const tone = getExecutiveScoreTone(score, thresholds)

  return (
    <Card variant="surface" className={cn("h-full overflow-hidden py-0", tone.border)}>
      <CardContent className="relative grid min-h-[8.5rem] grid-rows-[auto_1fr_auto] gap-3 px-5 py-4">
        <span className={cn("absolute inset-x-0 top-0 h-0.5", tone.bg)} />
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="whitespace-nowrap text-xs font-semibold uppercase leading-none tracking-[0.08em] text-muted-foreground">Score general del grupo</p>
        </div>
        <div className="flex min-w-0 items-end justify-between gap-3">
          <div className="flex min-w-0 items-end gap-3">
            <p className={cn("text-[2.65rem] font-semibold leading-none tracking-tight", tone.text)}>
              {score !== null ? score : "-"}{score !== null && <span className="text-2xl">%</span>}
            </p>
            <div className={cn(
              "mb-1 inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2.5 text-sm font-semibold",
              delta === null ? "bg-muted/20 text-muted-foreground" : trendUp ? "bg-status-success-surface text-status-success-text" : "bg-status-danger-surface text-status-danger-text",
            )}>
              {delta !== null && <TrendIcon className="h-3.5 w-3.5" />}
              {formatDelta(delta)}
            </div>
          </div>
        </div>
        <p className="border-t border-border/50 pt-2 text-xs leading-snug text-muted-foreground">Comparado con el ciclo anterior</p>
      </CardContent>
    </Card>
  )
}

// Tarjeta reutilizable para contadores ejecutivos sin semántica de puntuación.
export function CeoMetricCard({
  title,
  value,
  detail,
  accentClassName = "bg-border",
}: {
  title: string
  value: number
  detail?: string
  accentClassName?: string
}) {
  return (
    <Card variant="surface" className="h-full overflow-hidden py-0">
      <CardContent className="relative grid min-h-[8.5rem] grid-rows-[auto_1fr_auto] gap-3 px-5 py-4">
        <span className={cn("absolute inset-x-0 top-0 h-0.5", accentClassName)} />
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="whitespace-nowrap text-xs font-semibold uppercase leading-none tracking-[0.08em] text-muted-foreground">{title}</p>
        </div>
        <div className="flex items-end">
          <p className="text-[2.65rem] font-semibold leading-none tracking-tight text-foreground">{value}</p>
        </div>
        {detail && <p className="line-clamp-2 border-t border-border/50 pt-2 text-xs leading-snug text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  )
}

// Representación semicircular del resultado, coloreada con los umbrales configurados.
function CeoGauge({ score, thresholds }: { score: number | null; thresholds: Umbral[] }) {
  const tone = getExecutiveScoreTone(score, thresholds)
  const radius = 72
  const circumference = Math.PI * radius
  const clampedScore = Math.max(0, Math.min(100, score ?? 0))

  return (
    <div className="relative h-44 w-72 max-w-full">
      <svg viewBox="0 0 180 100" className="h-full w-full overflow-visible">
        <path
          d="M 18 90 A 72 72 0 0 1 162 90"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="18"
          className="text-muted"
        />
        <path
          d="M 18 90 A 72 72 0 0 1 162 90"
          fill="none"
          stroke={tone.fill}
          strokeDasharray={`${(clampedScore / 100) * circumference} ${circumference}`}
          strokeLinecap="round"
          strokeWidth="18"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-8 text-center">
        <p className={cn("text-5xl font-semibold leading-none tracking-tight", tone.text)}>{score !== null ? `${score}%` : "-"}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Score global</p>
      </div>
    </div>
  )
}

// Distribuye las unidades por umbral y calcula la brecha hasta la meta óptima.
export function CeoGroupHealth({ score, lotes, thresholds }: { score: number | null; lotes: SupervisorLoteSummary[]; thresholds: Umbral[] }) {
  const scoredLotes = lotes.filter((lote): lote is SupervisorLoteSummary & { unitScore: number } => lote.unitScore !== null)
  const configuredThresholds = getConfiguredScoreThresholds(thresholds)
  const groups = configuredThresholds.map((threshold) => ({
    label: getThresholdRangeLabel(threshold),
    count: scoredLotes.filter((lote) => lote.unitScore >= threshold.min && lote.unitScore <= threshold.max).length,
    tone: getThresholdTone(threshold.color),
  }))
  const target = configuredThresholds.find((threshold) => threshold.color === "verde")?.min
    ?? configuredThresholds.at(-1)?.min
    ?? 100
  const gap = score !== null ? Math.max(0, Number((target - score).toFixed(1))) : null

  return (
    <Card className="h-full border-border/70 bg-card py-0 shadow-none">
      <CardHeader className="px-5 pb-1 pt-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="h-2 w-2 rounded-sm bg-status-success-solid" />
          Salud del grupo
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 px-5 pb-4 pt-0 md:grid-cols-[minmax(18rem,1.2fr)_minmax(15.5rem,0.8fr)] md:items-center">
        <div className="flex justify-center md:justify-start">
          <CeoGauge score={score} thresholds={thresholds} />
        </div>
        <div className="mx-auto w-full max-w-[16rem]">
          <div className="space-y-2.5">
            {groups.map((group) => (
              <div key={group.label} className="grid grid-cols-[minmax(0,1fr)_3.75rem] items-center gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={cn("h-3 w-3 shrink-0 rounded-full", group.tone.bg)} />
                  <span className="min-w-0 text-sm font-medium leading-tight">{group.label}</span>
                </div>
                <span className="text-right text-sm font-semibold tabular-nums">{group.count} UN</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_4.25rem] items-center gap-3 border-t border-border/60 pt-3 text-sm">
            <span className="font-medium leading-tight">Brecha hacia la meta</span>
            <span className="text-right font-semibold tabular-nums text-status-warning-text">{gap !== null ? `${gap} pts` : "-"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Desglosa dos ciclos comparables hasta verticales y controles individuales.
function CeoHistoricalDetailDialog({
  open,
  onOpenChange,
  history,
  selectedUnitId,
  selectedVerticalId,
  unitOptions,
  thresholds,
  unitLocked = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  history: CeoCycleSummary[]
  selectedUnitId: string
  selectedVerticalId: string
  unitOptions: { id: string; name: string }[]
  thresholds: Umbral[]
  unitLocked?: boolean
}) {
  const defaultUnitId = selectedUnitId !== "all" ? selectedUnitId : unitOptions[0]?.id ?? "all"
  const [detailUnitId, setDetailUnitId] = useState(defaultUnitId)

  useEffect(() => {
    const nextDefault = selectedUnitId !== "all" ? selectedUnitId : unitOptions[0]?.id ?? "all"
    setDetailUnitId((current) => unitOptions.some((unit) => unit.id === current) ? current : nextDefault)
  }, [selectedUnitId, unitOptions])

  const comparedCycles: CeoComparedCycle[] = history.slice(-2).map((cycle) => ({
    id: cycle.id,
    label: cycle.label,
    lote: cycle.lotes.find((lote) => lote.unidadNegocioId === detailUnitId),
  }))
  const latestLote = [...comparedCycles].reverse().find((cycle) => cycle.lote)?.lote

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto sm:w-[94vw] xl:max-w-[78rem]">
        <DialogHeader className="pr-10 text-left">
          <DialogTitle>Detalle comparativo de evolución histórica</DialogTitle>
          <DialogDescription>
            Comparación de los últimos dos ciclos disponibles para la unidad seleccionada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-md border border-border/60 bg-muted/15 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-background">
                {latestLote?.unidadLogo ? (
                  <SafeImage src={latestLote.unidadLogo} alt={latestLote.unidadNombre} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm font-semibold">{(latestLote?.unidadNombre ?? "UN").slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{latestLote?.unidadNombre ?? "Unidad sin datos"}</p>
                <p className="truncate text-sm text-muted-foreground">{latestLote?.modeloNombre ?? "Sin modelo cargado"}</p>
              </div>
            </div>

            <Select value={detailUnitId} onValueChange={setDetailUnitId} disabled={unitLocked || unitOptions.length <= 1}>
              <SelectTrigger className="h-9 w-full border-border bg-secondary/70 md:w-[18rem]">
                <SelectValue placeholder="Unidad de negocio" />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            {comparedCycles.map((cycle, cycleIndex) => {
              const lote = cycle.lote
              const verticalDetails = buildCeoCycleVerticalDetails(lote, selectedVerticalId)
              const cyclePositionLabel = comparedCycles.length > 1 && cycleIndex === 0
                ? "Penúltimo ciclo evaluado"
                : "Último ciclo evaluado"

              return (
                <div key={cycle.id} className="rounded-md border border-border/60 bg-background/35 p-4">
                  <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{cyclePositionLabel}</p>
                      <p className="mt-1 text-sm font-semibold">{cycle.label}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{lote?.modeloNombre ?? "Sin evaluación en este ciclo"}</p>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0", getExecutiveScoreTone(lote?.unitScore, thresholds).text)}>
                      {formatScore(lote?.unitScore)}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {verticalDetails.map((vertical) => (
                      <div key={vertical.key} className="rounded-md border border-border/60 bg-background">
                        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{vertical.name}</p>
                          </div>
                          <div className="grid shrink-0 grid-cols-2 divide-x divide-border/60 overflow-hidden rounded-md border border-border/60 bg-muted/15 text-center">
                            <div className="px-3 py-1.5">
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Peso</p>
                              <p className="mt-0.5 text-sm font-semibold tabular-nums">{vertical.weight}%</p>
                            </div>
                            <div className="px-3 py-1.5">
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Logrado</p>
                              <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatScore(vertical.achieved)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="divide-y divide-border/50">
                          {vertical.controls.map((control) => (
                            <div key={control.key} className="grid gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/35 sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] sm:items-center">
                              <div className="min-w-0">
                                <p className="truncate font-medium leading-snug">{control.label}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Base {control.allocation}%</p>
                              </div>
                              <div className="text-left sm:text-right">
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Aporte</p>
                                <p className="font-semibold tabular-nums">{formatScore(control.achieved)}</p>
                              </div>
                              <Button asChild variant="outline" size="sm" className="w-fit justify-self-start text-xs sm:justify-self-end">
                                <Link href={`/evaluaciones/${control.key}`}>Ver control</Link>
                              </Button>
                            </div>
                          ))}
                          {vertical.controls.length === 0 && (
                            <p className="px-3 py-4 text-sm text-muted-foreground">Sin controles cargados en esta vertical.</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {verticalDetails.length === 0 && (
                      <p className="rounded-md border border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                        Sin verticales para mostrar en este ciclo.
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Permite navegar la evolución temporal y abrir el detalle de cada unidad.
export function CeoHistoricalChart({
  history,
  selectedUnitId,
  onSelectedUnitIdChange,
  selectedVerticalId,
  onSelectedVerticalIdChange,
  unitOptions,
  verticalOptions,
  thresholds,
  unitLocked = false,
}: {
  history: CeoCycleSummary[]
  selectedUnitId: string
  onSelectedUnitIdChange: (value: string) => void
  selectedVerticalId: string
  onSelectedVerticalIdChange: (value: string) => void
  unitOptions: { id: string; name: string }[]
  verticalOptions: { id: string; name: string }[]
  thresholds: Umbral[]
  unitLocked?: boolean
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const points = history.map((cycle) => {
    let lotes = cycle.lotes
    if (selectedUnitId !== "all") {
      lotes = lotes.filter((lote) => lote.unidadNegocioId === selectedUnitId)
    }

    const verticalScores = lotes.flatMap((lote) =>
      lote.verticalScores
        .filter((vertical) => selectedVerticalId === "all" || areVerticalGroupKeysSimilar(getVerticalGroupKey(vertical.name), selectedVerticalId))
        .map((vertical) => vertical.performancePct)
        .filter((score): score is number => score !== null),
    )
    const score = selectedVerticalId === "all"
      ? averageUnitScore(lotes)
      : verticalScores.length
        ? Math.round(verticalScores.reduce((sum, value) => sum + value, 0) / verticalScores.length)
        : null

    return { label: cycle.label, score }
  })
  const width = 360
  const height = 180
  const padding = 24
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2
  const coords = points.map((point, index) => {
    const x = points.length > 1 ? padding + (index / (points.length - 1)) * chartWidth : width / 2
    const y = point.score !== null ? padding + ((100 - point.score) / 100) * chartHeight : null
    return { ...point, x, y }
  })
  const scoredCoords = coords.filter((point) => point.y !== null && point.score !== null)
  const path = scoredCoords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y as number}`).join(" ")

  return (
    <>
      <Card className="h-full border-border/70 bg-card py-0 shadow-none">
        <CardHeader className="px-5 pb-4 pt-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <span className="h-2 w-2 rounded-sm bg-status-success-solid" />
                Evolución histórica
              </CardTitle>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:max-w-[34rem]">
              <Select value={selectedUnitId} onValueChange={onSelectedUnitIdChange}>
                <SelectTrigger className="h-9 w-full border-border bg-secondary/70">
                  <SelectValue placeholder="Unidad" />
                </SelectTrigger>
                <SelectContent>
                  {!unitLocked && <SelectItem value="all">Todas las UN</SelectItem>}
                  {unitOptions.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedVerticalId} onValueChange={onSelectedVerticalIdChange}>
                <SelectTrigger className="h-9 w-full border-border bg-secondary/70">
                  <SelectValue placeholder="Vertical" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las verticales</SelectItem>
                  {verticalOptions.map((vertical) => (
                    <SelectItem key={vertical.id} value={vertical.id}>{vertical.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <div className="h-[15rem] w-full overflow-hidden rounded-md border border-border/60 bg-muted/15">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
              {[0, 25, 50, 75, 100].map((tick) => {
                const y = padding + ((100 - tick) / 100) * chartHeight
                return (
                  <g key={tick}>
                    <line x1={padding} x2={width - padding} y1={y} y2={y} stroke="currentColor" strokeDasharray="4 4" className="text-border" />
                    <text x={6} y={y + 4} className="fill-muted-foreground text-xs">{tick}</text>
                  </g>
                )
              })}
              <line x1={padding} x2={width - padding} y1={padding} y2={padding} stroke="currentColor" strokeDasharray="4 4" className="text-muted-foreground" />
              {path && <path d={path} fill="none" stroke="var(--success)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />}
              {coords.map((point) => point.y !== null && point.score !== null ? (
                <g key={point.label}>
                  <circle cx={point.x} cy={point.y} r="4" fill="var(--success)" />
                  <text x={point.x} y={Math.max(12, point.y - 9)} textAnchor="middle" className="fill-success text-xs font-semibold">{point.score}%</text>
                  <text x={point.x} y={height - 7} textAnchor="middle" className="fill-muted-foreground text-xs">{point.label}</text>
                </g>
              ) : (
                <g key={point.label}>
                  <text x={point.x} y={height - 7} textAnchor="middle" className="fill-muted-foreground text-xs">{point.label}</text>
                  <text x={point.x} y={height / 2} textAnchor="middle" className="fill-muted-foreground text-xs">S/D</text>
                </g>
              ))}
            </svg>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-full gap-2 border-border bg-secondary/60 sm:w-auto"
              disabled={history.length === 0 || unitOptions.length === 0}
              onClick={() => setDetailsOpen(true)}
            >
              <Eye className="h-3.5 w-3.5" />
              Ver detalles
            </Button>
          </div>
        </CardContent>
      </Card>
      <CeoHistoricalDetailDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        history={history}
        selectedUnitId={selectedUnitId}
        selectedVerticalId={selectedVerticalId}
        unitOptions={unitOptions}
        thresholds={thresholds}
        unitLocked={unitLocked}
      />
    </>
  )
}

// Ordena unidades por resultado para facilitar la priorización ejecutiva.
export function CeoRanking({ lotes, thresholds }: { lotes: SupervisorLoteSummary[]; thresholds: Umbral[] }) {
  const ranking = [...lotes].sort((a, b) => (b.unitScore ?? -1) - (a.unitScore ?? -1))

  return (
    <Card className="h-full border-border/70 bg-card py-0 shadow-none">
      <CardHeader className="px-5 pb-1 pt-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="h-2 w-2 rounded-sm bg-status-success-solid" />
          Ranking - score por UN
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-5 pb-4 pt-0">
        {ranking.map((lote, index) => {
          const tone = getExecutiveScoreTone(lote.unitScore, thresholds)
          const width = lote.unitScore !== null ? `${Math.max(5, Math.min(100, lote.unitScore))}%` : "0%"
          return (
            <div key={lote.id} className="grid grid-cols-[2rem_minmax(6rem,0.42fr)_minmax(8rem,1fr)] items-center gap-3">
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold", tone.soft, tone.text)}>
                {index + 1}
              </span>
              <p className="truncate text-sm font-semibold">{lote.unidadNombre}</p>
              <div className="h-5 overflow-hidden rounded-md bg-muted">
                {lote.unitScore !== null ? (
                  <div className={cn("flex h-full items-center justify-end rounded-md pr-2 text-xs font-semibold text-background", tone.bg)} style={{ width }}>
                    {lote.unitScore}%
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-end pr-2 text-xs font-semibold text-muted-foreground">S/D</div>
                )}
              </div>
            </div>
          )
        })}
        {ranking.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Sin unidades evaluadas.</p>}
      </CardContent>
    </Card>
  )
}

// Cruza unidades y verticales en una matriz semafórica basada en umbrales dinámicos.
export function CeoSemaphoreMatrix({ lotes, thresholds }: { lotes: SupervisorLoteSummary[]; thresholds: Umbral[] }) {
  const configuredThresholds = getConfiguredScoreThresholds(thresholds)
  const verticalGroupMap = new Map<string, { key: string; name: string; weight: number }>()
  lotes.forEach((lote) => {
    lote.verticalScores.forEach((vertical) => {
      const key = findSimilarVerticalGroupKey(verticalGroupMap.keys(), vertical.name)
      if (!verticalGroupMap.has(key)) {
        verticalGroupMap.set(key, { key, name: vertical.name, weight: vertical.weight })
      }
    })
  })
  const verticals = Array.from(verticalGroupMap.values())
  const columns: CeoSemaphoreColumn[] = [
    {
      id: "general",
      label: "Calificacion general",
      weight: 100,
      getScore: (lote: SupervisorLoteSummary) => lote.unitScore,
      hasVertical: () => true,
    },
    ...verticals.slice(0, 4).map((vertical, index) => ({
      id: vertical.key,
      label: vertical.name || `Vertical ${index + 1}`,
      weight: vertical.weight,
      getScore: (lote: SupervisorLoteSummary) => {
        const achievedScores = lote.verticalScores
          .filter((item) => areVerticalGroupKeysSimilar(getVerticalGroupKey(item.name), vertical.key))
          .map((item) => item.achieved)
          .filter((score): score is number => score !== null)

        return achievedScores.length ? Number(achievedScores.reduce((sum, score) => sum + score, 0).toFixed(1)) : null
      },
      getToneScore: (lote: SupervisorLoteSummary) => {
        const scores = lote.verticalScores
          .filter((item) => areVerticalGroupKeysSimilar(getVerticalGroupKey(item.name), vertical.key))
          .map((item) => item.performancePct)
          .filter((score): score is number => score !== null)

        return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null
      },
      hasVertical: (lote: SupervisorLoteSummary) => lote.verticalScores.some((item) => areVerticalGroupKeysSimilar(getVerticalGroupKey(item.name), vertical.key)),
    })),
  ]
  const gridTemplateColumns = `minmax(7rem,1.15fr) repeat(${columns.length}, minmax(0,1fr))`

  return (
    <Card className="h-full border-border/70 bg-card py-0 shadow-none">
      <CardHeader className="px-5 pb-2 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="h-2 w-2 rounded-sm bg-status-success-solid" />
          Semaforo - UN x vertical
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        <div className="min-w-0">
          <div className="grid gap-2 pb-2 text-center text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground sm:text-xs" style={{ gridTemplateColumns }}>
            <span className="text-left">Unidad</span>
            {columns.map((column) => (
              <span key={column.id} className="min-w-0">
                <span className="block truncate">{column.label}</span>
                {column.weight !== null && <span className="block text-xs font-medium sm:text-xs">{column.weight}%</span>}
              </span>
            ))}
          </div>
          <div className="space-y-2">
            {lotes.map((lote) => (
              <div key={lote.id} className="grid items-center gap-2" style={{ gridTemplateColumns }}>
                <p className="min-w-0 truncate text-xs font-semibold sm:text-sm">{lote.unidadNombre}</p>
                {columns.map((column) => {
                    const hasVertical = column.hasVertical(lote)
                    const score = column.getScore(lote)
                    const toneScore = column.getToneScore ? column.getToneScore(lote) : score
                    const tone = getExecutiveScoreTone(toneScore, thresholds)
                    if (!hasVertical) {
                      return <div key={`${lote.id}-${column.id}`} aria-hidden="true" />
                    }

                    if (score === null) {
                      return (
                        <div key={`${lote.id}-${column.id}`} className="rounded-md border border-border/60 bg-muted/15 px-1.5 py-2 text-center text-xs font-semibold tabular-nums text-muted-foreground sm:text-sm">
                          S/D
                        </div>
                      )
                    }

                    return (
                      <div key={`${lote.id}-${column.id}`} className={cn("rounded-md border px-1.5 py-2 text-center text-xs font-semibold tabular-nums sm:text-sm", tone.soft, tone.border, tone.text)}>
                        {score}%
                      </div>
                    )
                  })}
              </div>
            ))}
            {lotes.length === 0 && (
              <p className="rounded-md border border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                Sin unidades evaluadas para la seleccion.
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
            {configuredThresholds.map((threshold) => (
              <span key={threshold.id} className="flex items-center gap-1">
                <span className={cn("h-3 w-3 rounded-sm", getThresholdTone(threshold.color).bg)} />
                {getThresholdRangeLabel(threshold)}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}



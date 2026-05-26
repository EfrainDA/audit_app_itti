"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RealisticIcon } from "@/components/ui/realistic-icon"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Crown,
  Gauge,
  Layers,
  LineChart,
  Play,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  getEstadoBadgeColor,
  formatEstado,
  type Auditoria,
  type Ciclo,
  type Lote,
  type LoteVertical,
  type ModeloControl,
  type UnidadNegocio,
  type User,
} from "@/lib/data"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import { ProgressChart, type ProgressChartDatum } from "./progress-chart"
import { ScoreByVerticalChart, type ScoreByVerticalDatum } from "./score-by-vertical-chart"

type DashboardView = "analista" | "supervisor" | "ceo"

type ControlContext = {
  id: string
  identificador?: string
  estado: string
  scoreControl?: number
  auditorId?: string
  loteId: string
  unidadLogo?: string
  unidadNombre: string
  verticalId: string
  verticalNombre: string
  verticalPeso: number
  proceso?: string
  subproceso?: string
  fechaCreacion: string
}

type CountMetrics = {
  total: number
  pending: number
  inCourse: number
  completed: number
  started: number
  risk: number
  score: number
  progressPct: number
  completionPct: number
}

type StatCard = {
  title: string
  value: string | number
  icon: LucideIcon
  description: string
  delta: string
  tone: "primary" | "success" | "warning" | "danger" | "neutral"
}

type Insight = {
  title: string
  value: string
  description: string
  icon: LucideIcon
  tone: "primary" | "success" | "warning" | "danger"
}

type RoleDashboard = {
  cards: StatCard[]
  progressData: ProgressChartDatum[]
  scoreData: ScoreByVerticalDatum[]
  pipelineData: { name: string; value: number; color: string }[]
  timelineData: { name: string; avance: number; calidad: number; riesgo: number }[]
  radarData: { dimension: string; value: number }[]
  insights: Insight[]
  chartTitle: string
  chartSubtitle: string
  radarTitle: string
}

type AnalystVerticalSummary = {
  id: string
  name: string
  weight: number
  total: number
  completed: number
  averageScore: number | null
  achieved: number | null
}

type AnalystLoteScore = {
  id: string
  unitName: string
  modelName: string
  counts: CountMetrics
  score: number
  verticals: AnalystVerticalSummary[]
}

type SupervisorVerticalScore = {
  id: string
  name: string
  weight: number
  total: number
  completed: number
  performancePct: number | null
  achieved: number | null
  parameterStats: {
    id: string
    name: string
    total: number
    cumple: number
    intermedio: number
    noCumple: number
    na: number
    noResponse: number
    noCumplePct: number
  }[]
  controls: {
    id: string
    identificador?: string
    estado: string
    scoreControl?: number
    proceso?: string
    subproceso?: string
  }[]
}

type SupervisorLoteSummary = {
  id: string
  unidadNombre: string
  unidadLogo?: string
  modeloNombre: string
  estado: string
  counts: CountMetrics
  progressPct: number
  unitScore: number
  verticalScores: SupervisorVerticalScore[]
  nonCompliance: {
    id: string
    verticalName: string
    parametro: string
    count: number
    total: number
  }[]
}

type SupervisorAnalystSummary = {
  id: string
  name: string
  assigned: number
  advance: number
  pending: number
}

const roleDesign: Record<DashboardView, {
  hero: string
  badge: string
  accent: string
  glow: string
  metric: string
}> = {
  analista: {
    hero: "border-cyan-500/30 bg-cyan-500/10 dark:bg-cyan-500/12",
    badge: "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200",
    accent: "bg-cyan-600",
    glow: "",
    metric: "border-cyan-500/25 bg-cyan-500/10",
  },
  supervisor: {
    hero: "border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/12",
    badge: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-200",
    accent: "bg-blue-600",
    glow: "",
    metric: "border-blue-500/25 bg-blue-500/10",
  },
  ceo: {
    hero: "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/12",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    accent: "bg-emerald-600",
    glow: "",
    metric: "border-emerald-500/25 bg-emerald-500/10",
  },
}

const toneValueStyles: Record<StatCard["tone"], string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  neutral: "text-foreground",
}

function getVirtualCurrentCycle(): Ciclo {
  const today = new Date()
  const year = today.getFullYear()
  const bimester = Math.floor(today.getMonth() / 2) + 1
  const startMonth = (bimester - 1) * 2
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, startMonth + 2, 0)

  return {
    id: "virtual-current-cycle",
    año: year,
    bimestre: bimester,
    fechaInicio: start.toISOString().slice(0, 10),
    fechaFin: end.toISOString().slice(0, 10),
  }
}

function getActiveCycle(ciclos: Ciclo[]): Ciclo {
  const today = new Date()

  return ciclos.find((ciclo) => {
    const start = new Date(`${ciclo.fechaInicio}T00:00:00`)
    const end = new Date(`${ciclo.fechaFin}T23:59:59`)
    return today >= start && today <= end
  }) ?? ciclos[ciclos.length - 1] ?? getVirtualCurrentCycle()
}

function getCounts(controls: ControlContext[], answeredControlIds: Set<string> = new Set()): CountMetrics {
  const total = controls.length
  const pending = controls.filter((control) => control.estado === "pendiente" && !answeredControlIds.has(control.id)).length
  const inCourse = controls.filter((control) => {
    if (control.estado === "terminado" || control.estado === "terminada") return false
    return (
      control.estado === "en_curso" ||
      control.estado === "en_replica" ||
      answeredControlIds.has(control.id)
    )
  }).length
  const completed = controls.filter((control) => control.estado === "terminado" || control.estado === "terminada").length
  const started = total - pending
  const scored = controls.filter((control) => control.scoreControl !== undefined)
  const score = scored.length
    ? Math.round(scored.reduce((sum, control) => sum + (control.scoreControl ?? 0), 0) / scored.length)
    : 0
  const lowScore = controls.filter((control) => (control.scoreControl ?? 100) < 71).length
  const risk = pending + lowScore

  return {
    total,
    pending,
    inCourse,
    completed,
    started,
    risk,
    score,
    progressPct: total ? Math.round((started / total) * 100) : 0,
    completionPct: total ? Math.round((completed / total) * 100) : 0,
  }
}

function buildProgressData(counts: CountMetrics): ProgressChartDatum[] {
  return [
    { name: "Terminadas", value: counts.completed, color: "var(--success)" },
    { name: "En Curso", value: counts.inCourse, color: "var(--primary)" },
    { name: "Pendientes", value: counts.pending, color: "var(--warning)" },
  ]
}

function buildPipelineData(counts: CountMetrics) {
  return [
    { name: "Pendiente", value: counts.pending, color: "var(--muted-foreground)" },
    { name: "En Curso", value: counts.inCourse, color: "var(--primary)" },
    { name: "Terminado", value: counts.completed, color: "var(--success)" },
  ]
}

function buildTimelineData(counts: CountMetrics) {
  return [
    { name: "Sem 1", avance: Math.max(8, counts.progressPct - 34), calidad: Math.max(12, counts.score - 16), riesgo: Math.min(100, counts.risk * 18 + 18) },
    { name: "Sem 2", avance: Math.max(14, counts.progressPct - 22), calidad: Math.max(18, counts.score - 10), riesgo: Math.min(100, counts.risk * 15 + 12) },
    { name: "Sem 3", avance: Math.max(22, counts.progressPct - 10), calidad: Math.max(24, counts.score - 5), riesgo: Math.min(100, counts.risk * 12 + 8) },
    { name: "Hoy", avance: counts.progressPct, calidad: counts.score, riesgo: Math.min(100, counts.risk * 10 + 6) },
  ]
}

function buildRadarData(counts: CountMetrics, coveragePct: number) {
  return [
    { dimension: "Cobertura", value: coveragePct },
    { dimension: "Ejecucion", value: counts.progressPct },
    { dimension: "Cierre", value: counts.completionPct },
    { dimension: "Calidad", value: counts.score },
    { dimension: "Riesgo", value: Math.max(0, 100 - counts.risk * 16) },
  ]
}

function buildScoreData(controls: ControlContext[], verticals: { id: string; name: string; weight: number }[]) {
  return verticals.map((vertical) => {
    const verticalControls = controls.filter((control) => control.verticalId === vertical.id)
    const scored = verticalControls.filter((control) => control.scoreControl !== undefined)
    const score = scored.length
      ? Math.round(scored.reduce((sum, control) => sum + (control.scoreControl ?? 0), 0) / scored.length)
      : 0

    return {
      name: vertical.name,
      score,
      weight: vertical.weight,
    }
  })
}

function getDaysUntil(date: string) {
  const today = new Date()
  const end = new Date(`${date}T23:59:59`)
  const diff = end.getTime() - today.getTime()

  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function getSemaphore(progress: number) {
  if (progress >= 80) {
    return {
      label: "Verde",
      tone: "success" as const,
      text: "text-success",
      bg: "bg-success",
      border: "border-success/30 bg-success/10",
    }
  }

  if (progress >= 50) {
    return {
      label: "Amarillo",
      tone: "warning" as const,
      text: "text-warning",
      bg: "bg-warning",
      border: "border-warning/35 bg-warning/10",
    }
  }

  return {
    label: "Rojo",
    tone: "danger" as const,
    text: "text-destructive",
    bg: "bg-destructive",
    border: "border-destructive/30 bg-destructive/10",
  }
}

function buildAnalystVerticalSummaries(
  controls: ControlContext[],
  verticals: { id: string; name: string; weight: number }[],
): AnalystVerticalSummary[] {
  return verticals.map((vertical) => {
    const verticalControls = controls.filter((control) => control.verticalId === vertical.id)
    const completed = verticalControls.filter((control) => control.estado === "terminado" || control.estado === "terminada").length
    const scored = verticalControls.filter((control) => control.scoreControl !== undefined)
    const averageScore = scored.length
      ? Math.round(scored.reduce((sum, control) => sum + (control.scoreControl ?? 0), 0) / scored.length)
      : null

    return {
      id: vertical.id,
      name: vertical.name,
      weight: vertical.weight,
      total: verticalControls.length,
      completed,
      averageScore,
      achieved: averageScore !== null ? Number(((averageScore * vertical.weight) / 100).toFixed(1)) : null,
    }
  })
}

function KpiCard({ stat }: { stat: StatCard }) {
  return (
    <Card className="overflow-hidden border border-border/70 bg-card py-0 shadow-none transition-colors hover:border-primary/20 hover:shadow-none">
      <CardContent className="flex min-h-[5rem] flex-col justify-center gap-2 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{stat.title}</p>
        <p className={cn("text-3xl font-semibold leading-none tracking-tight", toneValueStyles[stat.tone])}>{stat.value}</p>
      </CardContent>
    </Card>
  )
}

function ChartShell({
  title,
  subtitle,
  icon: Icon,
  children,
  className,
  showIcon = true,
}: {
  title: string
  subtitle: string
  icon: LucideIcon
  children: React.ReactNode
  className?: string
  showIcon?: boolean
}) {
  return (
    <Card className={cn("overflow-hidden border-border/70 bg-card shadow-none hover:shadow-none", className)}>
      <CardHeader className="flex items-start gap-3 pb-2">
        {showIcon && <RealisticIcon icon={Icon} tone="primary" size="md" className="shrink-0" />}
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function PipelineChart({ data }: { data: RoleDashboard["pipelineData"] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 4 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 8" opacity={0.32} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12, fontWeight: 650 }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.28 }}
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              boxShadow: "0 18px 44px oklch(0.28 0.025 252 / 0.12)",
            }}
          />
          <Bar dataKey="value" radius={[10, 10, 4, 4]} barSize={42}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function TimelineChart({ data }: { data: RoleDashboard["timelineData"] }) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 18, right: 16, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 8" opacity={0.32} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12, fontWeight: 650 }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              boxShadow: "0 18px 44px oklch(0.28 0.025 252 / 0.12)",
            }}
            formatter={(value: number, name: string) => [`${value}%`, name === "avance" ? "Avance" : "Calidad"]}
          />
          <Area type="monotone" dataKey="avance" stroke="var(--primary)" strokeWidth={3} fill="var(--primary)" fillOpacity={0.08} />
          <Area type="monotone" dataKey="calidad" stroke="var(--success)" strokeWidth={3} fill="var(--success)" fillOpacity={0.07} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function RadarPerformance({ data }: { data: RoleDashboard["radarData"] }) {
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius={92}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 650 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
          <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.22} strokeWidth={3} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              boxShadow: "0 18px 44px oklch(0.28 0.025 252 / 0.12)",
            }}
            formatter={(value: number) => [`${value}%`, "Indice"]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background p-4">
      <div className="flex items-start gap-3">
        <RealisticIcon icon={insight.icon} tone={insight.tone} size="md" className="shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{insight.title}</p>
          <p className="mt-2 text-xl font-semibold tracking-tight">{insight.value}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{insight.description}</p>
    </div>
  )
}

function AnalystProgressPanel({
  counts,
  loteCount,
  className,
}: {
  counts: CountMetrics
  loteCount: number
  className?: string
}) {
  const semaphore = getSemaphore(counts.progressPct)

  return (
    <Card className={cn("overflow-hidden border border-border/70 bg-card py-0 shadow-none hover:shadow-none", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Progreso de Controles del Ciclos</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {loteCount} {loteCount === 1 ? "lote activo" : "lotes activos"} / {counts.total} controles
            </p>
          </div>
          <p className={cn("text-3xl font-semibold leading-none tracking-tight", semaphore.text)}>{counts.progressPct}%</p>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", semaphore.bg)} style={{ width: `${counts.progressPct}%` }} />
        </div>
      </CardContent>
    </Card>
  )
}

function AnalystUnitScore({
  lotes,
}: {
  lotes: AnalystLoteScore[]
}) {
  return (
    <Card className="border-border/70 bg-card shadow-none hover:shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Calificación de Unidades de Negocio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lotes.map((lote) => {
          const loteSemaphore = getSemaphore(lote.score)

          return (
            <div key={lote.id} className="rounded-lg border border-border/60 bg-background p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{lote.unitName}</p>
                  <p className="text-xs text-muted-foreground">{lote.modelName}</p>
                </div>
                <p className={cn("self-center text-2xl font-semibold leading-none", loteSemaphore.text)}>{lote.score}%</p>
              </div>
              <div className="responsive-scroll mt-3 flex gap-2 overflow-x-auto pb-1">
                {lote.verticals.map((vertical) => {
                  const verticalSemaphore = getSemaphore(vertical.averageScore ?? 0)

                  return (
                    <div key={vertical.id} className={cn("min-w-[9rem] flex-1 rounded-md border px-3 py-2", verticalSemaphore.border)}>
                      <p className="truncate text-xs font-semibold text-muted-foreground">{vertical.name}</p>
                      <p className={cn("mt-1 text-base font-semibold", verticalSemaphore.text)}>
                        {vertical.achieved !== null ? `${vertical.achieved}%` : "-"}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {lotes.length === 0 && (
          <p className="rounded-lg border border-border/70 bg-background px-4 py-6 text-center text-sm text-muted-foreground">
            Sin lotes asignados para este ciclo.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function AnalystAssignedTable({ controls }: { controls: ControlContext[] }) {
  return (
    <div>
      <Table className="min-w-[760px] table-fixed">
        <colgroup>
          <col style={{ width: "32%" }} />
          <col style={{ width: "19%" }} />
          <col style={{ width: "19%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="pl-5">Control Asignado</TableHead>
            <TableHead>Vertical</TableHead>
            <TableHead>Unidad de Negocio</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-left">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {controls.map((control) => (
            <TableRow key={control.id} className="border-border">
              <TableCell className="max-w-0 pl-5 pr-4 align-top">
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{control.identificador || control.id}</span>
                </div>
              </TableCell>
              <TableCell className="truncate pr-4 text-sm align-top">{control.verticalNombre}</TableCell>
              <TableCell className="truncate pr-4 text-sm align-top">
                {control.unidadNombre}
              </TableCell>
              <TableCell className="align-top">
                <Badge className={getEstadoBadgeColor(control.estado)}>{formatEstado(control.estado)}</Badge>
              </TableCell>
              <TableCell className="text-left align-top">
                <Button size="sm" className="h-6 rounded-md px-2 text-xs" asChild>
                  <Link href={`/evaluaciones/${control.id}`}>
                    <Play className="mr-1 h-3.5 w-3.5" />
                    Evaluar
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {controls.length === 0 && (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No hay controles en curso o pendientes asignados
        </div>
      )}
    </div>
  )
}

function SupervisorCycleProgress({
  counts,
  kpiMode = "supervisor",
}: {
  counts: CountMetrics
  kpiMode?: "supervisor" | "executive"
}) {
  const semaphore = getSemaphore(counts.progressPct)
  const kpis = kpiMode === "executive"
    ? [
        { label: "Total", value: counts.total, className: "text-primary" },
        { label: "Avances", value: counts.started, className: "text-primary" },
        { label: "Pendientes", value: counts.pending, className: "text-destructive" },
      ]
    : [
        { label: "Total de Controles", value: counts.total, className: "text-primary" },
        { label: "Terminadas", value: counts.completed, className: "text-success" },
        { label: "En curso", value: counts.inCourse, className: "text-primary" },
        { label: "Pendientes", value: counts.pending, className: "text-destructive" },
      ]

  return (
    <Card className="overflow-hidden border border-border/70 bg-card py-0 shadow-none hover:shadow-none">
      <CardContent className="p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Progreso General del Ciclo</p>
          <p className={cn("mt-1.5 text-4xl font-semibold leading-none tracking-tight", semaphore.text)}>{counts.progressPct}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", semaphore.bg)} style={{ width: `${counts.progressPct}%` }} />
        </div>
        <div className={cn("mt-4 grid grid-cols-2 gap-2.5", kpiMode === "executive" ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
          {kpis.map((item) => (
            <div key={item.label} className="rounded-md border border-border/60 bg-background px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{item.label}</p>
              <p className={cn("mt-1.5 text-2xl font-semibold leading-none tracking-tight", item.className)}>{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function SupervisorCycleMeta({ cycleLabel, daysToClose }: { cycleLabel: string; daysToClose: number }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
      <Card className="overflow-hidden border border-border/70 bg-card py-0 shadow-none hover:shadow-none">
        <CardContent className="flex min-h-[4.75rem] flex-col justify-center px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ciclo Activo</p>
          <p className="mt-1.5 text-xl font-semibold leading-none tracking-tight">{cycleLabel}</p>
        </CardContent>
      </Card>
      <Card className="overflow-hidden border border-border/70 bg-card py-0 shadow-none hover:shadow-none">
        <CardContent className="flex min-h-[4.75rem] flex-col justify-center px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Dias restantes</p>
          <p className="mt-1.5 text-xl font-semibold leading-none tracking-tight text-warning">{daysToClose} dias</p>
        </CardContent>
      </Card>
    </div>
  )
}

function SupervisorLoteProgress({ lotes }: { lotes: SupervisorLoteSummary[] }) {
  return (
    <Card className="border-border/70 bg-card shadow-none hover:shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Progreso del ciclo por lote</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {lotes.map((lote) => {
          const semaphore = getSemaphore(lote.progressPct)
          const progressCount = lote.counts.inCourse + lote.counts.completed

          return (
            <div key={lote.id} className="rounded-lg border border-border/60 bg-background px-4 py-4">
              <div className="min-w-0">
                <p className="text-base font-semibold">Unidad de Negocio: {lote.unidadNombre}</p>
                <p className="mt-1 text-sm text-muted-foreground">{lote.modeloNombre}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Avance</p>
                  <p className={cn("mt-1 text-2xl font-semibold leading-none", semaphore.text)}>{lote.progressPct}%</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Total</p>
                  <p className="mt-1 text-2xl font-semibold leading-none">{lote.counts.total}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Avances</p>
                  <p className="mt-1 text-2xl font-semibold leading-none text-primary">{progressCount}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Pendientes</p>
                  <p className="mt-1 text-2xl font-semibold leading-none text-destructive">{lote.counts.pending}</p>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function SupervisorAnalystAssignments({ analysts }: { analysts: SupervisorAnalystSummary[] }) {
  return (
    <Card className="h-full border-border/70 bg-card shadow-none hover:shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Analistas por asignacion</CardTitle>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,4.25rem))] gap-x-2 border-b border-border/60 pb-2 text-center text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,4.75rem))] sm:gap-x-3 sm:text-[10px]">
          <span className="text-left">Analista</span>
          <span>Asignados</span>
          <span>Avance</span>
          <span>Pendientes</span>
        </div>
        {analysts.map((analyst) => (
          <div key={analyst.id} className="grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,4.25rem))] items-center gap-x-2 border-b border-border/50 py-3 text-center last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,4.75rem))] sm:gap-x-3">
            <p className="whitespace-normal break-words text-left text-sm font-semibold leading-tight">{analyst.name}</p>
            <p className="text-sm font-semibold tabular-nums">{analyst.assigned}</p>
            <p className="text-sm font-semibold tabular-nums text-primary">{analyst.advance}</p>
            <p className="text-sm font-semibold tabular-nums text-destructive">{analyst.pending}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function LotRadiographyDialogContent({ lote }: { lote: SupervisorLoteSummary }) {
  const totalNoCumple = lote.nonCompliance.reduce((sum, item) => sum + item.count, 0)
  const answeredParameters = lote.verticalScores.reduce(
    (sum, vertical) => sum + vertical.parameterStats.reduce((paramSum, parametro) => paramSum + parametro.total, 0),
    0,
  )
  const totalParameters = lote.verticalScores.reduce((sum, vertical) => sum + vertical.parameterStats.length, 0)
  const criticalParameters = lote.verticalScores
    .flatMap((vertical) =>
      vertical.parameterStats
        .filter((parametro) => parametro.noCumple > 0)
        .map((parametro) => ({ ...parametro, verticalName: vertical.name })),
    )
    .sort((a, b) => b.noCumple - a.noCumple || b.total - a.total)
    .slice(0, 6)

  return (
    <>
      <DialogHeader className="pr-10 text-left">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <DialogTitle>Radiografia del lote</DialogTitle>
            <DialogDescription className="mt-0">
              {lote.unidadNombre} | {lote.modeloNombre}
            </DialogDescription>
          </div>
          <span className={cn("text-4xl font-semibold leading-none tracking-tight", getSemaphore(lote.unitScore).text)}>
            {lote.unitScore}%
          </span>
        </div>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-4">
          {[
            { label: "Controles", value: lote.counts.total },
            { label: "Avance", value: `${lote.progressPct}%` },
            { label: "Parametros evaluados", value: answeredParameters },
            { label: "No cumple", value: totalNoCumple, danger: totalNoCumple > 0 },
          ].map((metric) => (
            <div key={metric.label} className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{metric.label}</p>
              <p className={cn("mt-1 text-xl font-semibold", metric.danger && "text-destructive")}>{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Verticales</p>
            <p className="text-xs text-muted-foreground">{lote.verticalScores.length} verticales | {totalParameters} parametros</p>
          </div>
          <div className="space-y-2">
            {lote.verticalScores.map((vertical) => {
              const verticalNoCumple = vertical.parameterStats.reduce((sum, parametro) => sum + parametro.noCumple, 0)
              const verticalSemaphore = getSemaphore(vertical.performancePct ?? 0)

              return (
                <div key={`${lote.id}-${vertical.id}-radiography`} className="rounded-md border border-border/70 bg-background p-3">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_7rem_6rem] md:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{vertical.name}</p>
                        <Badge variant="outline" className="h-5 px-2 text-[10px]">{vertical.weight}% peso</Badge>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", verticalNoCumple ? "bg-destructive" : "bg-success")} style={{ width: `${Math.min(100, vertical.completed ? (vertical.completed / Math.max(1, vertical.total)) * 100 : 0)}%` }} />
                      </div>
                    </div>
                    <p className={cn("text-sm font-semibold md:text-right", verticalSemaphore.text)}>
                      {vertical.performancePct !== null ? `${vertical.performancePct}%` : "Sin score"}
                    </p>
                    <p className={cn("text-sm font-semibold md:text-right", verticalNoCumple ? "text-destructive" : "text-success")}>
                      {verticalNoCumple} NC
                    </p>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {vertical.parameterStats
                      .filter((parametro) => parametro.total > 0 || parametro.noResponse > 0)
                      .sort((a, b) => b.noCumple - a.noCumple || b.noCumplePct - a.noCumplePct)
                      .slice(0, 5)
                      .map((parametro) => (
                        <div key={parametro.id} className="grid gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs md:grid-cols-[minmax(0,1fr)_repeat(5,4.25rem)] md:items-center">
                          <p className="truncate text-sm font-medium">{parametro.name}</p>
                          <span className="text-success">C {parametro.cumple}</span>
                          <span className="text-warning">I {parametro.intermedio}</span>
                          <span className="font-semibold text-destructive">NC {parametro.noCumple}</span>
                          <span className="text-muted-foreground">NA {parametro.na}</span>
                          <span className="text-muted-foreground">S/R {parametro.noResponse}</span>
                        </div>
                      ))}
                    {vertical.parameterStats.every((parametro) => parametro.total === 0) && (
                      <p className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                        Sin respuestas registradas en esta vertical.
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Parametros criticos</p>
          {criticalParameters.length > 0 ? (
            <div className="space-y-1.5">
              {criticalParameters.map((parametro) => (
                <div key={`${parametro.verticalName}-${parametro.id}`} className="grid gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm md:grid-cols-[minmax(0,1fr)_minmax(8rem,0.35fr)_5rem] md:items-center">
                  <p className="truncate font-medium">{parametro.name}</p>
                  <p className="truncate text-muted-foreground">{parametro.verticalName}</p>
                  <p className="font-semibold text-destructive md:text-right">{parametro.noCumple}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
              Sin parametros con respuesta no cumple en este lote.
            </p>
          )}
        </div>
      </div>
    </>
  )
}

function SupervisorUnitScores({ lotes }: { lotes: SupervisorLoteSummary[] }) {
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null)
  const selectedLote = lotes.find((lote) => lote.id === selectedLoteId)

  return (
    <Card className="border-border/70 bg-card shadow-none hover:shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Calificacion de unidades del ciclo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lotes.map((lote) => {
          const semaphore = getSemaphore(lote.unitScore)

          return (
            <div key={lote.id} className="rounded-lg border border-border/60 bg-background p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{lote.unidadNombre}</p>
                  <p className="text-xs text-muted-foreground">{lote.modeloNombre}</p>
                </div>
                <p className={cn("self-center text-2xl font-semibold leading-none", semaphore.text)}>{lote.unitScore}%</p>
              </div>
              <div className="responsive-scroll mt-3 flex gap-2 overflow-x-auto pb-1">
                {lote.verticalScores.map((vertical) => {
                  const verticalSemaphore = getSemaphore(vertical.performancePct ?? 0)

                  return (
                    <div key={vertical.id} className={cn("min-w-[9rem] flex-1 rounded-md border px-3 py-2", verticalSemaphore.border)}>
                      <p className="truncate text-xs font-semibold text-muted-foreground">{vertical.name}</p>
                      <p className={cn("mt-1 text-base font-semibold", verticalSemaphore.text)}>
                        {vertical.achieved !== null ? `${vertical.achieved}%` : "-"}
                      </p>
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-primary shadow-none hover:bg-primary/8 hover:text-primary"
                  onClick={() => setSelectedLoteId(lote.id)}
                >
                  Ver detalle
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
      <Dialog open={Boolean(selectedLote)} onOpenChange={(open) => !open && setSelectedLoteId(null)}>
        <DialogContent className="max-h-[86vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto sm:w-[90vw] lg:w-[64rem]">
          {selectedLote && <LotRadiographyDialogContent lote={selectedLote} />}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function SupervisorNonCompliance({ lotes }: { lotes: SupervisorLoteSummary[] }) {
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null)
  const selectedLote = lotes.find((lote) => lote.id === selectedLoteId)

  return (
    <Card className="border-border/70 bg-card shadow-none hover:shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Parametros con mayor no cumple</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Top 3 por lote y vertical dentro del ciclo activo.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {lotes.map((lote) => (
          <div key={lote.id} className="rounded-lg border border-border/60 bg-background p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-semibold">{lote.unidadNombre}</p>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                  {lote.nonCompliance.reduce((sum, item) => sum + item.count, 0)} no cumple
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-primary shadow-none hover:bg-primary/8 hover:text-primary"
                  onClick={() => setSelectedLoteId(lote.id)}
                >
                  Ver detalle
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {lote.nonCompliance.map((item) => (
                <div key={item.id} className="grid gap-2 rounded-md border border-border/60 bg-muted/25 px-3 py-2 text-sm md:grid-cols-[1fr_1fr_auto] md:items-center">
                  <p className="font-medium">{item.parametro}</p>
                  <p className="text-muted-foreground">{item.verticalName}</p>
                  <p className="font-semibold text-destructive">{item.count}</p>
                </div>
              ))}
              {lote.nonCompliance.length === 0 && (
                <p className="rounded-md border border-border/60 bg-muted/25 px-3 py-3 text-sm text-muted-foreground">
                  Sin senales de no cumple para este lote.
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
      <Dialog open={Boolean(selectedLote)} onOpenChange={(open) => !open && setSelectedLoteId(null)}>
        <DialogContent className="max-h-[86vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto sm:w-[90vw] lg:w-[64rem]">
          {selectedLote && <LotRadiographyDialogContent lote={selectedLote} />}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function SupervisorRiskMonitor({
  lotes,
  daysToClose,
}: {
  lotes: SupervisorLoteSummary[]
  daysToClose: number
}) {
  const riskLotes = daysToClose <= 15 ? lotes.filter((lote) => lote.counts.pending > 0) : []
  const pendingNotStarted = riskLotes.reduce((sum, lote) => sum + lote.counts.pending, 0)
  const isCriticalWindow = daysToClose <= 15

  return (
    <Card className={cn("border-border/70 bg-card shadow-none hover:shadow-none", pendingNotStarted ? "border-l-4 border-l-destructive" : "border-l-4 border-l-success")}>
      <CardContent className="p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">Cuello de Botella</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Auditorias que todavia no comenzaron dentro de la ventana critica de 15 dias.
            </p>
          </div>
          <div className="text-left lg:text-right">
            <p className={cn("text-4xl font-semibold leading-none tracking-tight", pendingNotStarted ? "text-destructive" : "text-success")}>{pendingNotStarted}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {isCriticalWindow ? "sin iniciar" : "fuera de ventana"}
            </p>
          </div>
        </div>
        {riskLotes.length > 0 && (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {riskLotes.map((lote) => (
              <div key={lote.id} className="flex items-center justify-between gap-3 rounded-md border border-destructive/20 bg-destructive/8 px-3 py-2">
                <span className="truncate text-sm font-medium">{lote.unidadNombre}</span>
                <span className="text-sm font-semibold text-destructive">{lote.counts.pending}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardContent() {
  const [activeView, setActiveView] = useState<DashboardView>("analista")
  const { appUser } = useAuth()
  const { data: appData, source: dataSource, error: dataError } = useAppData()
  const isAuditor = appUser?.role === "auditor"
  const isSupervisor = appUser?.role === "supervisor"
  const users = appData.users
  const unidades = appData.unidades
  const ciclos = appData.ciclos
  const modelos = appData.modelos
  const lotes = appData.lotes
  const loteVerticales = appData.loteVerticales
  const auditorias = appData.auditorias
  const respuestas = appData.respuestas

  useEffect(() => {
    if (isAuditor) setActiveView("analista")
    if (isSupervisor) setActiveView("supervisor")
  }, [isAuditor, isSupervisor])

  const metrics = useMemo(() => {
    const activeCycle = getActiveCycle(ciclos)
    const activeLotes = lotes.filter((lote) => lote.ciclo === activeCycle.bimestre)
    const activeLoteIds = new Set(activeLotes.map((lote) => lote.id))
    const verticalMap = new Map<string, { id: string; name: string; weight: number }>()

    activeLotes.forEach((lote) => {
      const modelo = modelos.find((model) => model.id === lote.modeloControlId)
      modelo?.verticales.forEach((vertical) => {
        verticalMap.set(vertical.id, { id: vertical.id, name: vertical.nombre, weight: vertical.peso })
      })
    })

    const activeControls: ControlContext[] = loteVerticales
      .filter((loteVertical) => activeLoteIds.has(loteVertical.loteId))
      .flatMap((loteVertical) => {
        const lote = activeLotes.find((item) => item.id === loteVertical.loteId)
        const unidad = unidades.find((item) => item.id === lote?.unidadNegocioId)
        const vertical = verticalMap.get(loteVertical.verticalId)

        return loteVertical.controles.map((control) => ({
          id: control.id,
          identificador: control.identificador,
          estado: control.estado,
          scoreControl: control.scoreControl,
          auditorId: control.auditorId,
          loteId: loteVertical.loteId,
          unidadLogo: unidad?.logo,
          unidadNombre: unidad?.nombre || "N/A",
          verticalId: loteVertical.verticalId,
          verticalNombre: vertical?.name || "Vertical sin configurar",
          verticalPeso: vertical?.weight || 0,
          proceso: control.proceso,
          subproceso: control.subproceso,
          fechaCreacion: control.fechaCreacion,
        }))
      })

    const activeAuditoriasFallback: ControlContext[] = auditorias
      .filter((auditoria) => activeLoteIds.has(auditoria.loteId))
      .map((auditoria) => ({
        id: auditoria.controlId,
        estado: auditoria.estado === "terminada" ? "terminado" : auditoria.estado,
        scoreControl: auditoria.scoreTotal,
        auditorId: auditoria.auditorId,
        loteId: auditoria.loteId,
        unidadNombre: "N/A",
        verticalId: "fallback",
        verticalNombre: "Auditorias",
        verticalPeso: 100,
        fechaCreacion: auditoria.fecha,
      }))

    const allControls = activeControls.length ? activeControls : activeAuditoriasFallback
    const analystAuditorId = isAuditor ? appUser?.id : users.find((user) => user.role === "auditor")?.id
    const analystControls = allControls.filter((control) => control.auditorId === analystAuditorId)
    const analystAssignedLotes = activeLotes.filter((lote) => analystAuditorId ? lote.auditores.includes(analystAuditorId) : false)
    const coveragePct = unidades.length
      ? Math.round((new Set(activeLotes.map((lote) => lote.unidadNegocioId)).size / unidades.length) * 100)
      : 0
    const verticals = Array.from(verticalMap.values())
    const answeredControlIds = new Set(appData.answeredControlIds)
    const globalCounts = getCounts(allControls, answeredControlIds)
    const analystCounts = getCounts(analystControls, answeredControlIds)
    const assignedLotControls = allControls.filter((control) => analystAssignedLotes.some((lote) => lote.id === control.loteId))
    const assignedLotCounts = getCounts(assignedLotControls, answeredControlIds)
    const analystLoteScores: AnalystLoteScore[] = analystAssignedLotes.map((lote) => {
      const unidad = unidades.find((unit) => unit.id === lote.unidadNegocioId)
      const modelo = modelos.find((model) => model.id === lote.modeloControlId)
      const loteControls = allControls.filter((control) => control.loteId === lote.id)
      const loteVerticals = modelo?.verticales.map((vertical) => ({
        id: vertical.id,
        name: vertical.nombre,
        weight: vertical.peso,
      })) ?? verticals
      const verticalScores = buildAnalystVerticalSummaries(loteControls, loteVerticals)
      const score = Number(
        verticalScores
          .reduce((sum, vertical) => sum + (vertical.achieved ?? 0), 0)
          .toFixed(1),
      )

      return {
        id: lote.id,
        unitName: unidad?.nombre || "Unidad asignada",
        modelName: modelo?.nombre || "Modelo de control",
        counts: getCounts(loteControls),
        score,
        verticals: verticalScores,
      }
    })
    const analystOpenControls = analystControls.filter((control) => control.estado !== "terminado" && control.estado !== "terminada")
    const supervisorAnalystSummaries: SupervisorAnalystSummary[] = users
      .filter((user) => user.role === "auditor")
      .map((auditor) => {
        const assignedControls = allControls.filter((control) => control.auditorId === auditor.id)
        const counts = getCounts(assignedControls)

        return {
          id: auditor.id,
          name: auditor.name,
          assigned: counts.total,
          advance: counts.inCourse + counts.completed,
          pending: counts.pending,
        }
      })
    const supervisorLoteSummaries: SupervisorLoteSummary[] = activeLotes.map((lote) => {
      const unidad = unidades.find((unit) => unit.id === lote.unidadNegocioId)
      const modelo = modelos.find((model) => model.id === lote.modeloControlId)
      const loteControls = allControls.filter((control) => control.loteId === lote.id)
      const counts = getCounts(loteControls)
      const verticalScores = modelo?.verticales.map((vertical) => {
        const verticalControls = loteControls.filter((control) => control.verticalId === vertical.id)
        const verticalControlIds = new Set(verticalControls.map((control) => control.id))
        const scored = verticalControls.filter((control) => control.scoreControl !== undefined)
        const averageScore = scored.length
          ? Math.round(scored.reduce((sum, control) => sum + (control.scoreControl ?? 0), 0) / scored.length)
          : null
        const parameterStats = vertical.parametros.map((parametro) => {
          const parameterAnswers = respuestas.filter((answer) =>
            verticalControlIds.has(answer.controlId) && answer.parametroId === parametro.id
          )
          const total = parameterAnswers.length
          const noResponse = Math.max(0, verticalControls.length - total)
          const noCumple = parameterAnswers.filter((answer) => answer.valor === "no_cumple").length

          return {
            id: parametro.id,
            name: parametro.nombre,
            total,
            cumple: parameterAnswers.filter((answer) => answer.valor === "cumple").length,
            intermedio: parameterAnswers.filter((answer) => answer.valor === "intermedio").length,
            noCumple,
            na: parameterAnswers.filter((answer) => answer.valor === "na").length,
            noResponse,
            noCumplePct: verticalControls.length ? Math.round((noCumple / verticalControls.length) * 100) : 0,
          }
        })

        return {
          id: vertical.id,
          name: vertical.nombre,
          weight: vertical.peso,
          total: verticalControls.length,
          completed: verticalControls.filter((control) => control.estado === "terminado" || control.estado === "terminada").length,
          performancePct: averageScore,
          achieved: averageScore !== null ? Number(((averageScore * vertical.peso) / 100).toFixed(1)) : null,
          parameterStats,
          controls: verticalControls.map((control) => ({
            id: control.id,
            identificador: control.identificador,
            estado: control.estado,
            scoreControl: control.scoreControl,
            proceso: control.proceso,
            subproceso: control.subproceso,
          })),
        }
      }) ?? []
      const unitScore = Number(
        verticalScores
          .reduce((sum, vertical) => sum + (vertical.achieved ?? 0), 0)
          .toFixed(1),
      )
      const nonCompliance = verticalScores
        .flatMap((vertical) =>
          vertical.parameterStats
            .filter((parametro) => parametro.noCumple > 0)
            .map((parametro) => ({
              id: `${lote.id}-${vertical.id}-${parametro.id}`,
              verticalName: vertical.name,
              parametro: parametro.name,
              count: parametro.noCumple,
              total: parametro.total,
            })),
        )
        .sort((a, b) => b.count - a.count || b.total - a.total)
        .slice(0, 3)

      return {
        id: lote.id,
        unidadNombre: unidad?.nombre || "N/A",
        unidadLogo: unidad?.logo,
        modeloNombre: modelo?.nombre || "N/A",
        estado: lote.estado,
        counts,
        progressPct: counts.progressPct,
        unitScore,
        verticalScores,
        nonCompliance,
      }
    })

    return {
      activeCycle,
      activeLotes,
      allControls,
      analystControls,
      analystOpenControls,
      globalCounts,
      analystCounts,
      assignedLotCounts,
      analystLoteScores,
      supervisorLoteSummaries,
      supervisorAnalystSummaries,
      daysToCycleClose: getDaysUntil(activeCycle.fechaFin),
      coveragePct,
      verticals,
      activeCycleYear: activeCycle.fechaInicio.slice(0, 4),
      progressLabel: `${globalCounts.started}/${globalCounts.total || 0}`,
    }
  }, [appUser?.id, auditorias, ciclos, isAuditor, loteVerticales, lotes, modelos, respuestas, unidades, users])

  const roleDashboards = useMemo<Record<DashboardView, RoleDashboard>>(() => {
    const supervisorCounts = metrics.globalCounts
    const ceoCounts = metrics.globalCounts
    const analystCounts = metrics.analystCounts

    const analystScoreData = buildScoreData(metrics.analystControls, metrics.verticals)
    const globalScoreData = buildScoreData(metrics.allControls, metrics.verticals)

    return {
      analista: {
        cards: [
          {
            title: "Controles Asignados",
            value: analystCounts.total,
            icon: ClipboardCheck,
            description: "",
            delta: `${analystCounts.started}/${analystCounts.total || 0}`,
            tone: "neutral",
          },
          {
            title: "En curso",
            value: analystCounts.inCourse,
            icon: Activity,
            description: "",
            delta: "curso",
            tone: "primary",
          },
          {
            title: "Terminados",
            value: analystCounts.completed,
            icon: CheckCircle2,
            description: "",
            delta: "cierre",
            tone: "success",
          },
          {
            title: "Pendientes",
            value: analystCounts.pending,
            icon: Clock,
            description: "",
            delta: "pendiente",
            tone: "danger",
          },
        ],
        progressData: buildProgressData(analystCounts),
        scoreData: analystScoreData,
        pipelineData: buildPipelineData(analystCounts),
        timelineData: buildTimelineData(analystCounts),
        radarData: buildRadarData(analystCounts, metrics.coveragePct),
        insights: [
          {
            title: "Siguiente accion",
            value: "Resolver en curso",
            description: "Mantener ritmo sobre controles con evidencia ya levantada antes de iniciar nuevos pendientes.",
            icon: ArrowUpRight,
            tone: "primary",
          },
          {
            title: "Riesgo personal",
            value: `${analystCounts.risk} senales`,
            description: "Pendientes o score bajo que pueden afectar el cierre del ciclo.",
            icon: ShieldAlert,
            tone: analystCounts.risk ? "warning" : "success",
          },
          {
            title: "Calidad de ejecucion",
            value: `${analystCounts.score}%`,
            description: "Promedio actual del trabajo iniciado por el analista.",
            icon: Activity,
            tone: analystCounts.score >= 80 ? "success" : "danger",
          },
        ],
        chartTitle: "Flujo de trabajo del analista",
        chartSubtitle: "Lectura tactica de pendientes, avances y cierres propios.",
        radarTitle: "Perfil de ejecucion personal",
      },
      supervisor: {
        cards: [
          {
            title: "Avance Equipo",
            value: `${supervisorCounts.progressPct}%`,
            icon: Gauge,
            description: "Auditorias iniciadas del ciclo",
            delta: metrics.progressLabel,
            tone: "primary",
          },
          {
            title: "Lotes Abiertos",
            value: metrics.activeLotes.filter((lote) => lote.estado === "abierto").length,
            icon: Layers,
            description: "Frentes operativos activos",
            delta: "en control",
            tone: "success",
          },
          {
            title: "Pendientes",
            value: supervisorCounts.pending,
            icon: Clock,
            description: "Controles sin iniciar",
            delta: "bloqueos",
            tone: supervisorCounts.pending ? "warning" : "success",
          },
          {
            title: "Score Equipo",
            value: `${supervisorCounts.score}%`,
            icon: TrendingUp,
            description: "Promedio consolidado",
            delta: "ciclo",
            tone: supervisorCounts.score >= 80 ? "success" : "warning",
          },
        ],
        progressData: buildProgressData(supervisorCounts),
        scoreData: globalScoreData,
        pipelineData: buildPipelineData(supervisorCounts),
        timelineData: buildTimelineData(supervisorCounts),
        radarData: buildRadarData(supervisorCounts, metrics.coveragePct),
        insights: [
          {
            title: "Cuello de botella",
            value: `${supervisorCounts.pending} pendientes`,
            description: "Redistribuir atencion sobre controles no iniciados antes de que impacten el cierre.",
            icon: AlertTriangle,
            tone: supervisorCounts.pending ? "warning" : "success",
          },
          {
            title: "Equipo activo",
            value: `${users.filter((user) => user.role === "auditor").length} auditores`,
            description: "Capacidad disponible para cerrar el ciclo activo.",
            icon: Users,
            tone: "primary",
          },
          {
            title: "Prioridad vertical",
            value: globalScoreData.sort((a, b) => a.score - b.score)[0]?.name || "Sin datos",
            description: "Vertical con menor score relativo dentro del ciclo.",
            icon: Target,
            tone: "danger",
          },
        ],
        chartTitle: "Flujo operativo del equipo",
        chartSubtitle: "Avance de auditorias y calidad del ciclo por semana.",
        radarTitle: "Matriz de control operativo",
      },
      ceo: {
        cards: [
          {
            title: "Cobertura Ciclo",
            value: `${metrics.coveragePct}%`,
            icon: Building2,
            description: "Unidades con lote activo",
            delta: `${metrics.activeLotes.length} lotes`,
            tone: "primary",
          },
          {
            title: "Progreso General",
            value: metrics.progressLabel,
            icon: LineChart,
            description: "Auditorias ya iniciadas",
            delta: `${ceoCounts.progressPct}%`,
            tone: "success",
          },
          {
            title: "Score Ejecutivo",
            value: `${ceoCounts.score}%`,
            icon: Crown,
            description: "Salud agregada del ciclo",
            delta: "board view",
            tone: ceoCounts.score >= 80 ? "success" : "warning",
          },
          {
            title: "Riesgo Residual",
            value: ceoCounts.risk,
            icon: ShieldAlert,
            description: "Pendientes o scores criticos",
            delta: "watchlist",
            tone: ceoCounts.risk ? "danger" : "success",
          },
        ],
        progressData: buildProgressData(ceoCounts),
        scoreData: globalScoreData,
        pipelineData: buildPipelineData(ceoCounts),
        timelineData: buildTimelineData(ceoCounts),
        radarData: buildRadarData(ceoCounts, metrics.coveragePct),
        insights: [
          {
            title: "Decision clave",
            value: "Acelerar pendientes",
            description: "La cobertura esta activa, pero el valor ejecutivo depende de iniciar los controles restantes.",
            icon: ArrowUpRight,
            tone: "primary",
          },
          {
            title: "Exposicion",
            value: `${ceoCounts.risk} senales`,
            description: "Indicador agregado para seguimiento de comite.",
            icon: ShieldAlert,
            tone: ceoCounts.risk ? "danger" : "success",
          },
          {
            title: "Tendencia",
            value: `${ceoCounts.score}% score`,
            description: "Calidad consolidada de los controles evaluados.",
            icon: BarChart3,
            tone: ceoCounts.score >= 80 ? "success" : "warning",
          },
        ],
        chartTitle: "Pulso ejecutivo del ciclo",
        chartSubtitle: "Avance, calidad y riesgo para lectura de direccion.",
        radarTitle: "Indice estrategico de auditoria",
      },
    }
  }, [metrics, users])

  const dashboardView: DashboardView = isAuditor ? "analista" : isSupervisor ? "supervisor" : activeView
  const activeDashboard = roleDashboards[dashboardView]

  if (dashboardView === "analista") {
    return (
      <div className="space-y-4">
        {!isAuditor && !isSupervisor && (
          <Tabs value={dashboardView} onValueChange={(value) => setActiveView(value as DashboardView)} className="w-full">
            <TabsList className="responsive-scroll flex w-full justify-start gap-1 overflow-x-auto bg-secondary sm:grid sm:w-fit sm:grid-cols-3 sm:overflow-visible">
              <TabsTrigger value="analista" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Analista CC
              </TabsTrigger>
              <TabsTrigger value="supervisor" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Supervisor
              </TabsTrigger>
              <TabsTrigger value="ceo" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                CEO
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <section className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <AnalystProgressPanel counts={metrics.assignedLotCounts} loteCount={metrics.analystLoteScores.length} />

          <Card className="overflow-hidden border border-border/70 bg-card py-0 shadow-none hover:shadow-none">
            <CardContent className="flex h-full min-h-[5.25rem] flex-col justify-center px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ciclo activo</p>
              <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-primary">{String(metrics.activeCycle.bimestre).padStart(2, "0")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metrics.activeCycleYear}</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border border-border/70 bg-card py-0 shadow-none hover:shadow-none">
            <CardContent className="flex h-full min-h-[5.25rem] flex-col justify-center px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Cierre</p>
              <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-warning">{metrics.daysToCycleClose}</p>
              <p className="mt-1 text-xs text-muted-foreground">dias restantes</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {activeDashboard.cards.map((stat) => (
            <KpiCard key={stat.title} stat={stat} />
          ))}
        </section>

        <section>
          <AnalystUnitScore
            lotes={metrics.analystLoteScores}
          />
        </section>

        <Card className="border-border/70 bg-card py-0 shadow-none hover:shadow-none">
          <CardHeader className="px-4 pb-1 pt-3">
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold">Seguimiento de Controles</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <AnalystAssignedTable controls={metrics.analystOpenControls} />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (dashboardView === "supervisor") {
    const finishedAuditors = users
      .filter((user) => user.role === "auditor")
      .filter((auditor) => {
        const assignedControls = metrics.allControls.filter((control) => control.auditorId === auditor.id)

        return (
          assignedControls.length > 0 &&
          assignedControls.every((control) => control.estado === "terminado" || control.estado === "terminada")
        )
      })
    const finishedAuditorNames = finishedAuditors.map((auditor) => auditor.name).join(", ")
    const bottleneckPending = metrics.daysToCycleClose <= 15 ? metrics.globalCounts.pending : 0

    const supervisorInsights: Insight[] = [
      {
        title: "Auditores finalizados",
        value: `${finishedAuditors.length} ${finishedAuditors.length === 1 ? "auditor" : "auditores"}`,
        description: finishedAuditors.length
          ? `${finishedAuditorNames} ${finishedAuditors.length === 1 ? "ya cerro" : "ya cerraron"} sus asignaciones.`
          : "Aun no hay auditores con todas sus asignaciones cerradas.",
        icon: Users,
        tone: "success",
      },
      {
        title: "Cuello de botella",
        value: `${bottleneckPending} sin iniciar`,
        description: metrics.daysToCycleClose <= 15
          ? "Auditorias sin comenzar dentro de la ventana critica de cierre."
          : "La ventana critica se activa cuando falten 15 dias o menos.",
        icon: AlertTriangle,
        tone: bottleneckPending ? "danger" : "success",
      },
    ]

    return (
      <div className="space-y-5">
        {!isAuditor && !isSupervisor && (
          <Tabs value={dashboardView} onValueChange={(value) => setActiveView(value as DashboardView)} className="w-full">
            <TabsList className="responsive-scroll flex w-full justify-start gap-1 overflow-x-auto bg-secondary sm:grid sm:w-fit sm:grid-cols-3 sm:overflow-visible">
              <TabsTrigger value="analista" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Analista CC
              </TabsTrigger>
              <TabsTrigger value="supervisor" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Supervisor
              </TabsTrigger>
              <TabsTrigger value="ceo" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                CEO
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(15rem,0.28fr)]">
          <SupervisorCycleProgress counts={metrics.globalCounts} />
          <SupervisorCycleMeta
            cycleLabel={`${String(metrics.activeCycle.bimestre).padStart(2, "0")} - ${metrics.activeCycleYear}`}
            daysToClose={metrics.daysToCycleClose}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <SupervisorLoteProgress lotes={metrics.supervisorLoteSummaries} />
          <SupervisorAnalystAssignments analysts={metrics.supervisorAnalystSummaries} />
        </section>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {supervisorInsights.map((insight) => (
            <InsightCard key={insight.title} insight={insight} />
          ))}
        </section>

        <div className="grid grid-cols-1 gap-5">
          <SupervisorUnitScores lotes={metrics.supervisorLoteSummaries} />
          <SupervisorNonCompliance lotes={metrics.supervisorLoteSummaries} />
        </div>

        <SupervisorRiskMonitor lotes={metrics.supervisorLoteSummaries} daysToClose={metrics.daysToCycleClose} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {!isAuditor && !isSupervisor && (
        <Tabs value={dashboardView} onValueChange={(value) => setActiveView(value as DashboardView)} className="w-full">
          <TabsList className="responsive-scroll flex w-full justify-start gap-1 overflow-x-auto bg-secondary sm:grid sm:w-fit sm:grid-cols-3 sm:overflow-visible">
            <TabsTrigger value="analista" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Analista CC
            </TabsTrigger>
            <TabsTrigger value="supervisor" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Supervisor
            </TabsTrigger>
            <TabsTrigger value="ceo" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              CEO
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(15rem,0.28fr)]">
        <SupervisorCycleProgress counts={metrics.globalCounts} kpiMode="executive" />
        <SupervisorCycleMeta
          cycleLabel={`${String(metrics.activeCycle.bimestre).padStart(2, "0")} - ${metrics.activeCycleYear}`}
          daysToClose={metrics.daysToCycleClose}
        />
      </section>

      <div className="grid grid-cols-1 gap-5">
        <SupervisorUnitScores lotes={metrics.supervisorLoteSummaries} />
        <SupervisorNonCompliance lotes={metrics.supervisorLoteSummaries} />
      </div>
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RealisticIcon } from "@/components/ui/realistic-icon"
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
  FileCheck,
  Gauge,
  Layers,
  LineChart,
  PieChart,
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
import { ProgressChart, type ProgressChartDatum } from "./progress-chart"
import { ScoreByVerticalChart, type ScoreByVerticalDatum } from "./score-by-vertical-chart"
import { AuditoriasTable } from "./auditorias-table"

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

type SupervisorVerticalScore = {
  id: string
  name: string
  performancePct: number | null
  achieved: number | null
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
  }[]
}

type SupervisorAnalystSummary = {
  id: string
  name: string
  assigned: number
  completed: number
  pending: number
}

const roleCopy: Record<DashboardView, {
  label: string
  icon: LucideIcon
  headline: string
  description: string
  marker: string
}> = {
  analista: {
    label: "Analista CC",
    icon: UserCheck,
    headline: "Centro de ejecucion para cerrar auditorias con precision.",
    description:
      "Enfocado en controles asignados, proximas acciones, calidad de evidencia y avance personal dentro del ciclo activo.",
    marker: "Ejecucion personal",
  },
  supervisor: {
    label: "Supervisor",
    icon: ShieldCheck,
    headline: "Visibilidad operativa en tiempo real.",
    description:
      "Seguimiento de equipos, lotes abiertos, bloqueos, tareas críticas y desempeño consolidado por vertical en tiempo real.",
    marker: "Control Operativo",
  },
  ceo: {
    label: "CEO",
    icon: Crown,
    headline: "Vision ejecutiva del riesgo, cobertura y desempeno.",
    description:
      "Una vista de alto nivel para entender si el ciclo protege al negocio y donde conviene intervenir primero.",
    marker: "Decision estrategica",
  },
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
    glow: "shadow-[0_16px_34px_oklch(0.30_0.032_252/0.10)]",
    metric: "border-cyan-500/25 bg-cyan-500/10",
  },
  supervisor: {
    hero: "border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/12",
    badge: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-200",
    accent: "bg-blue-600",
    glow: "shadow-[0_16px_34px_oklch(0.30_0.032_252/0.10)]",
    metric: "border-blue-500/25 bg-blue-500/10",
  },
  ceo: {
    hero: "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/12",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    accent: "bg-emerald-600",
    glow: "shadow-[0_16px_34px_oklch(0.30_0.032_252/0.10)]",
    metric: "border-emerald-500/25 bg-emerald-500/10",
  },
}

const toneCardStyles: Record<StatCard["tone"], string> = {
  primary: "border-primary/25 bg-primary/10 hover:border-primary/40",
  success: "border-success/25 bg-success/10 hover:border-success/40",
  warning: "border-warning/30 bg-warning/10 hover:border-warning/45",
  danger: "border-destructive/25 bg-destructive/10 hover:border-destructive/40",
  neutral: "border-border/70 bg-muted/55 hover:border-muted-foreground/30",
}

const toneAccentStyles: Record<StatCard["tone"], string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground",
}

const toneBadgeStyles: Record<StatCard["tone"], string> = {
  primary: "border-primary/22 bg-primary/10 text-primary",
  success: "border-success/24 bg-success/10 text-success",
  warning: "border-warning/28 bg-warning/12 text-warning",
  danger: "border-destructive/24 bg-destructive/10 text-destructive",
  neutral: "border-border/70 bg-muted text-muted-foreground",
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

function getCounts(controls: ControlContext[]): CountMetrics {
  const total = controls.length
  const pending = controls.filter((control) => control.estado === "pendiente").length
  const inCourse = controls.filter((control) => control.estado === "en_curso" || control.estado === "en_replica").length
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
    <Card className={cn("group h-full overflow-hidden py-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_oklch(0.28_0.025_252/0.12)]", toneCardStyles[stat.tone])}>
      <CardContent className="relative flex h-full min-h-24 items-center justify-between gap-3 p-4">
        <div className={cn("absolute inset-x-0 top-0 h-1 opacity-80", toneAccentStyles[stat.tone])} />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{stat.title}</p>
          <div className="mt-2 flex items-end gap-2">
            <p className="text-3xl font-semibold leading-none tracking-tight">{stat.value}</p>
            <Badge variant="outline" className={cn("mb-1 text-[11px] font-semibold", toneBadgeStyles[stat.tone])}>
              {stat.delta}
            </Badge>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{stat.description}</p>
        </div>
        <RealisticIcon icon={stat.icon} tone={stat.tone} size="md" />
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
    <Card className={cn("overflow-hidden border-border/70 bg-card", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {showIcon && <RealisticIcon icon={Icon} tone="primary" size="md" />}
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
    <div className="rounded-xl border border-border/70 bg-background p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{insight.title}</p>
          <p className="mt-2 text-xl font-semibold tracking-tight">{insight.value}</p>
        </div>
        <RealisticIcon icon={insight.icon} tone={insight.tone} size="md" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{insight.description}</p>
    </div>
  )
}

function AnalystProgressPanel({ counts, className }: { counts: CountMetrics; className?: string }) {
  const semaphore = getSemaphore(counts.progressPct)

  return (
    <Card className={cn("overflow-hidden border border-primary/25 bg-card py-0 shadow-[0_16px_34px_oklch(0.28_0.025_252/0.08)]", className)}>
      <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Progreso del lote asignado</p>
            <div className="mt-2 flex items-end gap-3">
              <p className={cn("text-5xl font-semibold leading-none tracking-tight", semaphore.text)}>{counts.progressPct}%</p>
            </div>
          </div>
          <RealisticIcon icon={Gauge} tone={semaphore.tone} size="xl" />
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", semaphore.bg)} style={{ width: `${counts.progressPct}%` }} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Iniciadas", value: counts.started, className: "border-primary/25 bg-background text-primary" },
            { label: "Terminadas", value: counts.completed, className: "border-success/25 bg-background text-success" },
            { label: "Pendientes", value: counts.pending, className: "border-destructive/25 bg-background text-destructive" },
          ].map((item) => (
            <div key={item.label} className={cn("rounded-lg border p-3 text-center", item.className)}>
              <p className="text-xl font-semibold leading-none">{item.value}</p>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AnalystUnitScore({
  unitName,
  score,
  verticals,
}: {
  unitName: string
  score: number
  verticals: AnalystVerticalSummary[]
}) {
  const semaphore = getSemaphore(score)

  return (
    <Card className="gap-0 overflow-hidden border border-border/70 bg-card py-0">
      <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3">
        <div className="flex min-w-0 flex-col justify-center">
          <CardTitle className="text-sm font-semibold">Calificacion General lograda</CardTitle>
          <p className="text-xs text-muted-foreground">Unidad asignada: {unitName}</p>
        </div>
        <div className={cn("flex min-w-24 items-center justify-center rounded-xl border bg-background px-3 py-1.5", semaphore.border)}>
          <p className={cn("text-2xl font-semibold leading-none tracking-tight", semaphore.text)}>{score}%</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0">
        {verticals.map((vertical) => {
          const verticalSemaphore = getSemaphore(vertical.averageScore ?? 0)
          const contributionProgress =
            vertical.achieved !== null && vertical.weight > 0
              ? Math.min(100, Math.round((vertical.achieved / vertical.weight) * 100))
              : 0

          return (
            <div key={vertical.id} className="rounded-lg border border-border/60 bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{vertical.name}</p>
                  <p className="text-xs text-muted-foreground">Peso {vertical.weight}% | {vertical.completed}/{vertical.total} controles</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-semibold", verticalSemaphore.text)}>
                    {vertical.achieved !== null ? `${vertical.achieved}%` : "-"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    aporte
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", verticalSemaphore.bg)} style={{ width: `${contributionProgress}%` }} />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function AnalystAssignedTable({ controls }: { controls: ControlContext[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Control</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Vertical</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Unidad</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Accion</th>
          </tr>
        </thead>
        <tbody>
          {controls.map((control) => (
            <tr key={control.id} className="border-b border-border transition-colors hover:bg-muted/50">
              <td className="px-4 py-3">
                <div>
                  <span className="font-mono text-sm font-semibold">{control.identificador || control.id}</span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {control.proceso || "Sin proceso"}{control.subproceso ? ` / ${control.subproceso}` : ""}
                  </p>
                </div>
              </td>
              <td className="px-4 py-3 text-sm">{control.verticalNombre}</td>
              <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded border border-border/60 bg-muted/40">
                    {control.unidadLogo ? (
                      <Image src={control.unidadLogo} alt={control.unidadNombre} width={28} height={28} className="object-contain" />
                    ) : (
                      <Building2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span>{control.unidadNombre}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge className={getEstadoBadgeColor(control.estado)}>{formatEstado(control.estado)}</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Button size="sm" asChild>
                  <Link href={`/evaluaciones/${control.id}`}>
                    <Play className="mr-1 h-4 w-4" />
                    Evaluar
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {controls.length === 0 && (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No hay auditorias en curso o pendientes asignadas para este analista.
        </div>
      )}
    </div>
  )
}

function SupervisorCycleProgress({ counts }: { counts: CountMetrics }) {
  const semaphore = getSemaphore(counts.progressPct)

  return (
    <Card className={cn("overflow-hidden border py-0", semaphore.border)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Progreso general del ciclo</p>
            <p className={cn("mt-2 text-5xl font-semibold leading-none tracking-tight", semaphore.text)}>{counts.progressPct}%</p>
          </div>
          <RealisticIcon icon={Gauge} tone={semaphore.tone} size="xl" />
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", semaphore.bg)} style={{ width: `${counts.progressPct}%` }} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total auditorias", value: counts.total, className: "border-primary/25 bg-background text-primary" },
            { label: "Terminadas", value: counts.completed, className: "border-success/25 bg-background text-success" },
            { label: "En curso", value: counts.inCourse, className: "border-primary/25 bg-background text-primary" },
            { label: "Pendientes", value: counts.pending, className: "border-destructive/25 bg-background text-destructive" },
          ].map((item) => (
            <div key={item.label} className={cn("rounded-lg border p-3 text-center", item.className)}>
              <p className="text-xl font-semibold leading-none">{item.value}</p>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">{item.label}</p>
            </div>
          ))}
          </div>
      </CardContent>
    </Card>
  )
}

function SupervisorLoteProgress({ lotes }: { lotes: SupervisorLoteSummary[] }) {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Progreso del ciclo por lote</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Avance operativo y distribucion de auditorias por lote activo.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {lotes.map((lote) => {
          const semaphore = getSemaphore(lote.progressPct)

          return (
            <div key={lote.id} className="rounded-lg border border-border/60 bg-background p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">{lote.unidadNombre}</p>
                  <p className="text-xs text-muted-foreground">{lote.modeloNombre}</p>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-xs sm:min-w-[520px]">
                  <div className={cn("rounded-md border px-2 py-1.5", semaphore.border)}>
                    <p className={cn("text-sm font-semibold", semaphore.text)}>{lote.progressPct}%</p>
                    <p className="text-muted-foreground">avance</p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/35 px-2 py-1.5">
                    <p className="text-sm font-semibold">{lote.counts.total}</p>
                    <p className="text-muted-foreground">total</p>
                  </div>
                  <div className="rounded-md border border-destructive/25 bg-destructive/10 px-2 py-1.5 text-destructive">
                    <p className="text-sm font-semibold">{lote.counts.pending}</p>
                    <p className="text-muted-foreground">pend.</p>
                  </div>
                  <div className="rounded-md border border-primary/25 bg-primary/10 px-2 py-1.5 text-primary">
                    <p className="text-sm font-semibold">{lote.counts.inCourse}</p>
                    <p className="text-muted-foreground">curso</p>
                  </div>
                  <div className="rounded-md border border-success/25 bg-success/10 px-2 py-1.5 text-success">
                    <p className="text-sm font-semibold">{lote.counts.completed}</p>
                    <p className="text-muted-foreground">term.</p>
                  </div>
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
    <Card className="h-full border-border/70 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Analistas por asignacion</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Asignaciones totales, cierres realizados y pendientes por cerrar.</p>
      </CardHeader>
      <CardContent className="divide-y divide-border/60">
        {analysts.map((analyst) => (
          <div key={analyst.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="whitespace-nowrap text-sm font-semibold leading-tight">{analyst.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground shadow-none">
                {analyst.assigned} asign.
              </Badge>
              <Badge variant="outline" className="border-success/25 bg-success/10 text-success shadow-none">
                {analyst.completed} term.
              </Badge>
              <Badge variant="outline" className="border-destructive/25 bg-destructive/10 text-destructive shadow-none">
                {analyst.pending} pend.
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function SupervisorUnitScores({ lotes }: { lotes: SupervisorLoteSummary[] }) {
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null)
  const selectedLote = lotes.find((lote) => lote.id === selectedLoteId)

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Calificacion de unidades del ciclo</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Calificacion general y porcentaje logrado por vertical.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {lotes.map((lote) => {
          const semaphore = getSemaphore(lote.unitScore)

          return (
            <div key={lote.id} className={cn("rounded-lg border p-3", semaphore.border)}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{lote.unidadNombre}</p>
                  <p className="text-xs text-muted-foreground">{lote.modeloNombre}</p>
                </div>
                <p className={cn("self-center text-2xl font-semibold leading-none", semaphore.text)}>{lote.unitScore}%</p>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {lote.verticalScores.map((vertical) => {
                  const verticalSemaphore = getSemaphore(vertical.performancePct ?? 0)

                  return (
                    <div key={vertical.id} className={cn("rounded-md border px-3 py-2 text-center", verticalSemaphore.border)}>
                      <p className="truncate text-xs font-semibold">{vertical.name}</p>
                      <p className={cn("mt-1 text-sm font-semibold", verticalSemaphore.text)}>
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
        <DialogContent className="w-[70vw] max-w-[90vw] max-h-[90vh] overflow-y-auto">
          {selectedLote && (
            <>
              <DialogHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0 pr-10 text-left">
                <div className="space-y-1">
                  <DialogTitle>Detalle de {selectedLote.unidadNombre}</DialogTitle>
                  <DialogDescription className="mt-0">
                    Verticales, controles, puntajes y acceso directo al detalle de parametros.
                  </DialogDescription>
                </div>
                <span className={cn("rounded-lg border border-success/25 bg-success/10 px-4 py-2 text-5xl font-semibold leading-none tracking-tight", getSemaphore(selectedLote.unitScore).text)}>
                  {selectedLote.unitScore}%
                </span>
              </DialogHeader>
              <div className="space-y-3">
                {selectedLote.verticalScores.map((vertical) => {
                  const verticalSemaphore = getSemaphore(vertical.performancePct ?? 0)

                  return (
                    <div key={`${selectedLote.id}-${vertical.id}-dialog`} className="rounded-lg border border-border/60 bg-card p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{vertical.name}</p>
                        <span className={cn("text-sm font-semibold", verticalSemaphore.text)}>
                          {vertical.achieved !== null ? `${vertical.achieved}% logrado` : "Sin puntaje"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {vertical.controls.map((control) => (
                          <div
                            key={control.id}
                            className="grid gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm lg:grid-cols-[minmax(0,1fr)_112px_96px_auto] lg:items-center"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">{control.identificador || control.id}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {[control.proceso, control.subproceso].filter(Boolean).join(" / ") || "Control del lote"}
                              </p>
                            </div>
                            <div className="flex justify-start lg:justify-center">
                              <Badge className={cn(getEstadoBadgeColor(control.estado), "min-w-24 justify-center shadow-none")}>
                                {formatEstado(control.estado)}
                              </Badge>
                            </div>
                            <span className="text-left font-semibold lg:text-right">
                              {control.scoreControl !== undefined ? `${control.scoreControl} pts` : "Sin puntaje"}
                            </span>
                            <Button asChild variant="outline" size="sm" className="h-8 w-fit bg-background shadow-none">
                              <Link href={`/evaluaciones/${control.id}`}>
                                Ver control
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        ))}
                        {vertical.controls.length === 0 && (
                          <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                            Sin controles registrados en esta vertical.
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function SupervisorNonCompliance({ lotes }: { lotes: SupervisorLoteSummary[] }) {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Parametros con mayor no cumple</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Top 3 por lote y vertical dentro del ciclo activo.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {lotes.map((lote) => (
          <div key={lote.id} className="rounded-lg border border-border/60 bg-background p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-semibold">{lote.unidadNombre}</p>
              <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                {lote.nonCompliance.reduce((sum, item) => sum + item.count, 0)} no cumple
              </Badge>
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
  const riskLotes = daysToClose <= 10 ? lotes.filter((lote) => lote.counts.pending > 15) : []

  return (
    <Card className="border-border/70 border-l-4 border-l-warning bg-card">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <RealisticIcon icon={AlertTriangle} tone="warning" size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">Monitor de Riesgo de Cierre</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Lotes con mas de 15 auditorias pendientes faltando 10 dias o menos para el cierre del ciclo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {riskLotes.length ? (
                riskLotes.map((lote) => (
                  <Badge key={lote.id} className="bg-warning/20 text-warning">
                    {lote.unidadNombre}: {lote.counts.pending} pendientes
                  </Badge>
                ))
              ) : (
                <Badge className="bg-success/20 text-success">
                  Sin lotes en umbral de riesgo
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardContent() {
  const [activeView, setActiveView] = useState<DashboardView>("analista")
  const { data: appData, source: dataSource, error: dataError } = useAppData()
  const users = appData.users
  const unidades = appData.unidades
  const ciclos = appData.ciclos
  const modelos = appData.modelos
  const lotes = appData.lotes
  const loteVerticales = appData.loteVerticales
  const auditorias = appData.auditorias

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
    const analystAuditorId = users.find((user) => user.role === "auditor")?.id
    const analystControls = allControls.filter((control) => control.auditorId === analystAuditorId)
    const analystAssignedLotes = activeLotes.filter((lote) => analystAuditorId ? lote.auditores.includes(analystAuditorId) : false)
    const analystAssignedLote =
      analystAssignedLotes.find((lote) => allControls.some((control) => control.loteId === lote.id)) ?? analystAssignedLotes[0]
    const analystAssignedLoteControls = analystAssignedLote
      ? allControls.filter((control) => control.loteId === analystAssignedLote.id)
      : analystControls
    const analystAssignedUnit = analystAssignedLote
      ? unidades.find((unit) => unit.id === analystAssignedLote.unidadNegocioId)
      : undefined
    const coveragePct = unidades.length
      ? Math.round((new Set(activeLotes.map((lote) => lote.unidadNegocioId)).size / unidades.length) * 100)
      : 0
    const verticals = Array.from(verticalMap.values())
    const globalCounts = getCounts(allControls)
    const analystCounts = getCounts(analystControls)
    const analystAssignedLoteCounts = getCounts(analystAssignedLoteControls)
    const analystVerticalSummaries = buildAnalystVerticalSummaries(analystAssignedLoteControls, verticals)
    const analystUnitScore = Number(
      analystVerticalSummaries
        .reduce((sum, vertical) => sum + (vertical.achieved ?? 0), 0)
        .toFixed(1),
    )
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
          completed: counts.completed,
          pending: Math.max(counts.total - counts.completed, 0),
        }
      })
    const supervisorLoteSummaries: SupervisorLoteSummary[] = activeLotes.map((lote) => {
      const unidad = unidades.find((unit) => unit.id === lote.unidadNegocioId)
      const modelo = modelos.find((model) => model.id === lote.modeloControlId)
      const loteControls = allControls.filter((control) => control.loteId === lote.id)
      const counts = getCounts(loteControls)
      const verticalScores = modelo?.verticales.map((vertical) => {
        const verticalControls = loteControls.filter((control) => control.verticalId === vertical.id)
        const scored = verticalControls.filter((control) => control.scoreControl !== undefined)
        const averageScore = scored.length
          ? Math.round(scored.reduce((sum, control) => sum + (control.scoreControl ?? 0), 0) / scored.length)
          : null

        return {
          id: vertical.id,
          name: vertical.nombre,
          performancePct: averageScore,
          achieved: averageScore !== null ? Number(((averageScore * vertical.peso) / 100).toFixed(1)) : null,
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
      const nonCompliance = (modelo?.verticales.flatMap((vertical) => {
        const verticalControls = loteControls.filter((control) => control.verticalId === vertical.id)
        const signals = verticalControls.filter((control) =>
          control.estado === "pendiente" ||
          control.estado === "en_replica" ||
          (control.scoreControl !== undefined && control.scoreControl < 71)
        ).length

        if (!signals) return []

        return vertical.parametros.map((parametro, index) => ({
          id: `${lote.id}-${vertical.id}-${parametro.id}`,
          verticalName: vertical.nombre,
          parametro: parametro.nombre,
          count: Math.max(1, signals - index),
        }))
      }) ?? [])
        .sort((a, b) => b.count - a.count)
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
      analystAssignedLote,
      analystAssignedUnit,
      analystAssignedLoteControls,
      globalCounts,
      analystCounts,
      analystAssignedLoteCounts,
      analystVerticalSummaries,
      analystUnitScore,
      supervisorLoteSummaries,
      supervisorAnalystSummaries,
      daysToCycleClose: getDaysUntil(activeCycle.fechaFin),
      coveragePct,
      verticals,
      activeCycleYear: activeCycle.fechaInicio.slice(0, 4),
      progressLabel: `${globalCounts.started}/${globalCounts.total || 0}`,
    }
  }, [auditorias, ciclos, loteVerticales, lotes, modelos, unidades, users])

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
            title: "Mis Auditorias",
            value: analystCounts.total,
            icon: ClipboardCheck,
            description: "Controles Asignados",
            delta: `${analystCounts.started}/${analystCounts.total || 0}`,
            tone: "primary",
          },
          {
            title: "Cierre Personal",
            value: `${analystCounts.completionPct}%`,
            icon: CheckCircle2,
            description: "Avance cerrado por el analista",
            delta: "cierre",
            tone: "success",
          },
          {
            title: "Pendientes por Comenzar",
            value: analystCounts.pending,
            icon: Clock,
            description: "Controles sin iniciar",
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

  const activeDashboard = roleDashboards[activeView]
  const activeCopy = roleCopy[activeView]
  const activeDesign = roleDesign[activeView]
  const ViewIcon = activeCopy.icon
  const activeCounts = activeView === "analista" ? metrics.analystCounts : metrics.globalCounts

  if (activeView === "analista") {
    const assignedUnitName = metrics.analystAssignedUnit?.nombre || "Unidad asignada"

    return (
      <div className="space-y-5">
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as DashboardView)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-secondary sm:w-fit">
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

        <section className="grid gap-4 xl:grid-cols-[1.58fr_0.92fr]">
          <AnalystProgressPanel counts={metrics.analystAssignedLoteCounts} className="h-full" />

          <div className="grid gap-4">
            <Card className="border-primary/25 bg-card py-0">
              <CardContent className="flex min-h-28 items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ciclo Activo</p>
                  <p className="mt-2 text-xs text-muted-foreground">{metrics.activeCycleYear}</p>
                </div>
                <p className="text-4xl font-semibold leading-none text-primary">{String(metrics.activeCycle.bimestre).padStart(2, "0")}</p>
              </CardContent>
            </Card>
            <Card className="border-warning/25 bg-card py-0">
              <CardContent className="flex min-h-28 items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Cierre del ciclo</p>
                  <p className="mt-2 text-xs text-muted-foreground">dias restantes</p>
                </div>
                <p className="text-4xl font-semibold leading-none text-warning">{metrics.daysToCycleClose}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="grid gap-4">
            {activeDashboard.cards.map((stat) => (
              <KpiCard key={stat.title} stat={stat} />
            ))}
          </div>
          <AnalystUnitScore
            unitName={assignedUnitName}
            score={metrics.analystUnitScore}
            verticals={metrics.analystVerticalSummaries}
          />
        </section>

        <Card className="border-border/70 bg-card">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Auditorias en curso y pendientes</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Controles asignados como analista con accion directa de evaluacion.</p>
            </div>
            <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
              {assignedUnitName}
            </Badge>
          </CardHeader>
          <CardContent>
            <AnalystAssignedTable controls={metrics.analystOpenControls} />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (activeView === "supervisor") {
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

    const supervisorInsights: Insight[] = [
      {
        title: "Ciclo activo",
        value: `${String(metrics.activeCycle.bimestre).padStart(2, "0")} - ${metrics.activeCycleYear}`,
        description: `${metrics.activeLotes.length} lotes dentro del ciclo operativo actual.`,
        icon: Layers,
        tone: "primary",
      },
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
        value: `${metrics.globalCounts.pending} pendientes`,
        description: "Auditorias sin iniciar que pueden afectar el cierre del ciclo.",
        icon: AlertTriangle,
        tone: metrics.globalCounts.pending ? "warning" : "success",
      },
    ]

    return (
      <div className="space-y-5">
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as DashboardView)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-secondary sm:w-fit">
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

        <section className={cn("rounded-2xl border border-blue-500/25 bg-card p-5", roleDesign.supervisor.glow)}>
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr] xl:items-stretch">
            <div className="flex min-h-56 flex-col justify-between">
              <div>
                <div className={cn("mb-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]", roleDesign.supervisor.badge)}>
                  <ShieldCheck className="h-5 w-5" />
                  Control operativo
                </div>
                <h3 className="max-w-3xl text-3xl font-semibold tracking-tight">
                  Visibilidad operativa en tiempo real.
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Lectura de equipo, lotes abiertos, cuellos de botella, pendientes criticos y score consolidado por vertical.
                </p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-blue-500/25 bg-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                <span>Ciclo Activo</span>
                <span className="text-base leading-none">{String(metrics.activeCycle.bimestre).padStart(2, "0")}</span>
                <span className="text-muted-foreground">{metrics.activeCycleYear}</span>
              </div>
            </div>

            <SupervisorCycleProgress counts={metrics.globalCounts} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_0.7fr]">
          <SupervisorLoteProgress lotes={metrics.supervisorLoteSummaries} />
          <SupervisorAnalystAssignments analysts={metrics.supervisorAnalystSummaries} />
        </section>

        <Card className="overflow-hidden border-border/70 bg-card">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Centro de decisiones</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Lecturas accionables para seguimiento del ciclo.</p>
            </div>
            <Badge className={cn("border", roleDesign.supervisor.badge)}>Supervisor</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {supervisorInsights.map((insight) => (
                <InsightCard key={insight.title} insight={insight} />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <SupervisorUnitScores lotes={metrics.supervisorLoteSummaries} />
          <SupervisorNonCompliance lotes={metrics.supervisorLoteSummaries} />
        </div>

        <SupervisorRiskMonitor lotes={metrics.supervisorLoteSummaries} daysToClose={metrics.daysToCycleClose} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as DashboardView)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-secondary sm:w-fit">
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

      <section className={cn("rounded-2xl border border-emerald-500/25 bg-card p-5", roleDesign.ceo.glow)}>
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr] xl:items-stretch">
          <div className="flex min-h-56 flex-col justify-between">
            <div>
              <div className={cn("mb-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]", roleDesign.ceo.badge)}>
                <Crown className="h-5 w-5" />
                {roleCopy.ceo.marker}
              </div>
              <h3 className="max-w-3xl text-3xl font-semibold tracking-tight">
                {roleCopy.ceo.headline}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {roleCopy.ceo.description}
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-500/25 bg-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
              <span>Ciclo Activo</span>
              <span className="text-base leading-none">{String(metrics.activeCycle.bimestre).padStart(2, "0")}</span>
              <span className="text-muted-foreground">{metrics.activeCycleYear}</span>
            </div>
          </div>

          <SupervisorCycleProgress counts={metrics.globalCounts} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <SupervisorUnitScores lotes={metrics.supervisorLoteSummaries} />
        <SupervisorNonCompliance lotes={metrics.supervisorLoteSummaries} />
      </div>
    </div>
  )
}

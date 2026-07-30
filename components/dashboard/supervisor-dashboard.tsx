"use client"

// Componentes de supervisión. Cada bloque recibe resúmenes calculados y se
// concentra en comunicar avance, asignaciones, alertas y riesgo operativo.

/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/ui/safe-image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  type UnidadNegocio,
} from "@/lib/data"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import {
  getActiveCycle,
  getCounts,
  getDaysUntil,
  getExecutiveScoreTone,
  getSemaphore,
  type CountMetrics,
} from "@/features/dashboard/domain/metrics"
import { useExecutiveDashboard } from "@/features/dashboard/application/use-executive-dashboard"
import { DashboardCycleFilter } from "@/components/dashboard/dashboard-cycle-filter"

import { DashboardView, ControlContext, StatCard, RoleDashboard, SupervisorVerticalScore, SupervisorLoteSummary, SupervisorAnalystSummary, CeoCycleSummary, LotSummaryIndexes, appendToIndex, buildLotSummary, ParameterDistribution, CeoSemaphoreColumn, CeoComparedCycle, CeoCycleVerticalDetail, getControlCategory, getSummaryControlCategory, getControlProductLabels, getControlProcessLabel, getUniqueNonEmpty, normalizeComparableName, getVerticalGroupKey, areVerticalGroupKeysSimilar, findSimilarVerticalGroupKey, averageUnitScore, formatScore, formatCompactList, getControlDetailLabel, buildCeoCycleVerticalDetails, formatDelta } from "./dashboard-model"
import { SemiGauge } from "./analyst-dashboard"

// Muestra el avance consolidado del ciclo y la proporción completada.
export function SupervisorCycleProgress({
  counts,
  kpiMode = "supervisor",
}: {
  counts: CountMetrics
  kpiMode?: "supervisor" | "executive"
}) {
  const kpis = kpiMode === "executive"
    ? [
        { label: "Total", value: counts.total, className: "text-foreground", accent: "border-t-border" },
        { label: "Avances", value: counts.started, className: "text-primary", accent: "border-t-primary" },
        { label: "Pendientes", value: counts.pending, className: "text-status-danger-text", accent: "border-t-status-danger-solid" },
      ]
    : [
        { label: "Total", value: counts.total, className: "text-foreground", accent: "border-t-border" },
        { label: "Terminadas", value: counts.completed, className: "text-status-success-text", accent: "border-t-status-success-solid" },
        { label: "En curso", value: counts.inCourse, className: "text-primary", accent: "border-t-primary" },
        { label: "Pendientes", value: counts.pending, className: "text-status-danger-text", accent: "border-t-status-danger-solid" },
      ]

  return (
    <Card className="overflow-hidden border border-border/70 bg-card py-0 shadow-none">
      <CardContent className="grid min-h-[8.5rem] gap-5 px-4 py-4 md:grid-cols-[minmax(0,1fr)_15rem] md:items-center">
        <div className="min-w-0 space-y-3">
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight">Resumen Ejecutivo</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Progreso general del ciclo y estado operativo.</p>
          </div>
          <div className={cn("grid gap-2", kpiMode === "executive" ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4")}>
            {kpis.map((item) => (
              <div key={item.label} className={cn("rounded-md border border-t-2 border-border/60 bg-background px-3 py-2 shadow-none", item.accent)}>
                <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{item.label}</p>
                <p className={cn("mt-1.5 text-3xl font-semibold leading-none tracking-tight", item.className)}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center md:justify-end md:pr-1">
          <SemiGauge value={counts.progressPct} label="Avance" />
        </div>
      </CardContent>
    </Card>
  )
}

// Presenta el período activo y los días restantes para el cierre.
export function SupervisorCycleMeta({
  cycleNumber,
  cycleYear,
  daysToClose,
}: {
  cycleNumber: string
  cycleYear: string | number
  daysToClose: number
}) {
  return (
    <Card className="h-full overflow-hidden border border-border/70 bg-card py-0 shadow-none">
      <CardContent className="grid h-full min-h-[8.5rem] grid-rows-2 divide-y divide-border/60 p-0">
        <div className="flex min-w-0 items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Ciclo activo</p>
            <p className="mt-1 text-xs leading-none text-muted-foreground">{cycleYear}</p>
          </div>
          <p className="shrink-0 text-3xl font-semibold leading-none tracking-tight text-primary">{cycleNumber}</p>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Cierre</p>
            <p className="mt-1 text-xs leading-none text-muted-foreground">días restantes</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-semibold leading-none tracking-tight text-status-warning-text">{daysToClose}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Reúne los indicadores que requieren atención inmediata del supervisor.
export function SupervisorFocusPanel({
  lotes,
  unassignedControls,
}: {
  lotes: SupervisorLoteSummary[]
  unassignedControls: number
}) {
  const lotWithMostPending = [...lotes].sort((a, b) => b.counts.pending - a.counts.pending || a.progressPct - b.progressPct)[0]
  const lotsWithoutControls = lotes.filter((lote) => lote.counts.total === 0)
  const mostNonCompliantUnit = [...lotes]
    .map((lote) => ({
      id: lote.id,
      name: lote.unidadNombre,
      noCumple: lote.nonCompliance.reduce((sum, item) => sum + item.count, 0),
    }))
    .sort((a, b) => b.noCumple - a.noCumple)[0]

  const focusItems = [
    {
      title: "Lote con más pendientes",
      value: lotWithMostPending?.counts.pending ? lotWithMostPending.unidadNombre : "Sin pendientes",
      detail: lotWithMostPending
        ? `${lotWithMostPending.counts.pending} pendientes | ${lotWithMostPending.progressPct}% avance`
        : "No hay controles asignados.",
      icon: Clock,
      tone: lotWithMostPending?.counts.pending ? "danger" : "success",
    },
    {
      title: "Lotes sin controles",
      value: lotsWithoutControls.length ? String(lotsWithoutControls.length) : "0",
      detail: formatCompactList(lotsWithoutControls.map((lote) => lote.unidadNombre), "Todos los lotes tienen controles."),
      icon: Layers,
      tone: lotsWithoutControls.length ? "warning" : "success",
    },
    {
      title: "Controles sin analistas",
      value: String(unassignedControls),
      detail: unassignedControls ? "Requieren asignacion para avanzar." : "No hay controles sin responsable.",
      icon: Users,
      tone: unassignedControls ? "danger" : "success",
    },
    {
      title: "Unidad de Negocio con mayor incumplimiento",
      value: mostNonCompliantUnit?.noCumple ? mostNonCompliantUnit.name : "Sin incumplimiento",
      detail: mostNonCompliantUnit?.noCumple ? `${mostNonCompliantUnit.noCumple} respuestas no cumple` : "No hay respuestas no cumple.",
      icon: ShieldAlert,
      tone: mostNonCompliantUnit?.noCumple ? "danger" : "success",
    },
  ] satisfies {
    title: string
    value: string
    detail: string
    icon: LucideIcon
    tone: "success" | "warning" | "danger"
  }[]

  return (
    <Card className="h-full gap-0 border-border/70 bg-card py-0 shadow-none">
      <CardHeader className="px-4 pb-2 pt-4 sm:px-5">
        <CardTitle className="text-base font-semibold">De un vistazo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:px-5">
        <div className="grid gap-2">
          {focusItems.map((item) => {
            const Icon = item.icon

            return (
              <div key={item.title} className={cn(
                "rounded-md border border-border/60 bg-background px-3 py-2.5 transition-colors",
                item.tone === "danger" && "border-l-2 border-l-destructive",
                item.tone === "warning" && "border-l-2 border-l-warning",
                item.tone === "success" && "border-l-2 border-l-success",
              )}>
                <div className="flex items-start gap-3">
                  <span className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted/20",
                    item.tone === "danger" && "border-status-danger-border text-status-danger-text",
                    item.tone === "warning" && "border-status-warning-border text-status-warning-text",
                    item.tone === "success" && "border-status-success-border text-status-success-text",
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{item.title}</p>
                    <p className="mt-1 truncate text-[15px] font-semibold leading-tight">{item.value}</p>
                    <p className="mt-1.5 truncate text-xs font-medium text-muted-foreground" title={item.detail}>{item.detail}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Lista el progreso por lote sin recalcular métricas dentro de la tabla.
export function SupervisorLoteProgress({ lotes }: { lotes: SupervisorLoteSummary[] }) {
  return (
    <Card className="border-border/70 bg-card py-0 shadow-none">
      <CardHeader className="px-4 pb-2 pt-4">
        <CardTitle className="text-base font-semibold">Progreso del ciclo por lote</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 px-4 pb-4 pt-0 lg:grid-cols-2">
        {lotes.map((lote) => {
          const semaphore = getSemaphore(lote.progressPct)
          const progressCount = lote.counts.inCourse + lote.counts.completed

          return (
            <div key={lote.id} className="rounded-md border border-border/60 bg-card px-4 py-3 shadow-none">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Unidad</p>
                  <div className="mt-1 flex min-w-0 items-baseline gap-2">
                    <p className="truncate text-base font-semibold leading-tight">{lote.unidadNombre}</p>
                    <span className={cn("text-sm font-semibold tabular-nums", semaphore.text)}>{lote.progressPct}%</span>
                    <span className={cn("text-xs font-semibold", semaphore.text)}>{semaphore.label}</span>
                  </div>
                  <div className="mt-2 h-1.5 max-w-[16rem] overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", semaphore.bg)} style={{ width: `${lote.progressPct}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center text-sm sm:min-w-[11rem]">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Total</p>
                    <p className="mt-1 font-semibold leading-none">{lote.counts.total}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Avances</p>
                    <p className="mt-1 font-semibold leading-none text-primary">{progressCount}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Pend.</p>
                    <p className="mt-1 font-semibold leading-none text-status-danger-text">{lote.counts.pending}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-border/60 pt-2">
                <div className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_3rem] gap-2 px-2 pb-1 text-center text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <span className="text-left">Vertical</span>
                  <span>Total</span>
                  <span>Avance</span>
                  <span>Pend.</span>
                </div>
                <div className="space-y-1">
                  {lote.verticalScores.map((vertical) => {
                    const statusAdvance = vertical.controls.filter((control) =>
                      control.estado === "en_curso" ||
                      control.estado === "en_replica" ||
                      control.estado === "terminado" ||
                      control.estado === "terminada" ||
                      control.scoreControl !== undefined
                    ).length
                    const advance = Math.max(vertical.advance, statusAdvance)
                    const pending = Math.max(0, vertical.total - advance)

                    return (
                      <div key={`${lote.id}-${vertical.id}-inline-progress`} className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_3rem] items-center gap-2 rounded-md px-2 py-1.5 text-center transition-colors hover:bg-muted/25">
                        <p className="min-w-0 truncate text-left text-sm font-medium">{vertical.name}</p>
                        <span className="text-xs tabular-nums text-muted-foreground">{vertical.total}</span>
                        <span className="text-xs font-semibold tabular-nums text-primary">{advance}</span>
                        <span className="text-xs font-semibold tabular-nums text-status-danger-text">{pending}</span>
                      </div>
                    )
                  })}
                  {lote.verticalScores.length === 0 && (
                    <p className="rounded-md px-2 py-3 text-sm text-muted-foreground">Sin verticales configuradas.</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// Expone la carga y el avance de cada analista asignado.
export function SupervisorAnalystAssignments({ analysts }: { analysts: SupervisorAnalystSummary[] }) {
  return (
    <Card className="h-full gap-0 border-border/70 bg-card py-0 shadow-none">
      <CardHeader className="px-4 pb-2 pt-4 sm:px-5">
        <CardTitle className="text-base font-semibold">Carga por Analista</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 sm:px-5">
        <div className="min-w-0">
          <div className="grid grid-cols-[minmax(7rem,1fr)_repeat(4,minmax(3.4rem,4.75rem))] gap-x-2 border-b border-border/60 pb-2 text-center text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            <span className="text-left">Analista</span>
            <span>Asignado</span>
            <span>Avance</span>
            <span>Pend.</span>
            <span>% avance</span>
          </div>
          <div className="divide-y divide-border/50">
            {analysts.map((analyst) => (
              <div key={analyst.id} className="grid grid-cols-[minmax(7rem,1fr)_repeat(4,minmax(3.4rem,4.75rem))] items-center gap-x-2 py-2.5 text-center transition-colors hover:bg-muted/25">
                <p className="truncate text-left text-sm font-semibold leading-tight">{analyst.name}</p>
                <p className="text-sm font-semibold tabular-nums">{analyst.assigned}</p>
                <p className="text-sm font-semibold tabular-nums text-primary">{analyst.advance}</p>
                <p className="text-sm font-semibold tabular-nums text-status-danger-text">{analyst.pending}</p>
                <div className="text-sm font-semibold tabular-nums">
                  <p className={cn(analyst.progressPct >= 80 ? "text-status-success-text" : analyst.progressPct >= 50 ? "text-status-warning-text" : "text-status-danger-text")}>
                    {analyst.progressPct}%
                  </p>
                </div>
              </div>
            ))}
            {analysts.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">Sin analistas configurados.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Genera mensajes breves a partir de los principales indicadores del ciclo.
export function SupervisorInsightStrip({
  finishedAuditors,
  bottleneckPending,
  daysToClose,
}: {
  finishedAuditors: string[]
  bottleneckPending: number
  daysToClose: number
}) {
  const insights = [
    {
      title: "Auditores finalizados",
      value: `${finishedAuditors.length} ${finishedAuditors.length === 1 ? "auditor" : "auditores"}`,
      detail: finishedAuditors.length
        ? `${finishedAuditors.join(", ")} ${finishedAuditors.length === 1 ? "ya cerro" : "ya cerraron"} sus asignaciones.`
        : "Aun no hay auditores con todas sus asignaciones cerradas.",
      icon: Users,
      tone: "success" as const,
    },
    {
      title: "Cuello de botella",
      value: `${bottleneckPending} sin iniciar`,
      detail: daysToClose <= 15
        ? "Auditorías sin comenzar dentro de la ventana crítica de cierre."
        : "La ventana crítica se activa cuando falten 15 días o menos.",
      icon: AlertTriangle,
      tone: bottleneckPending ? "danger" as const : "success" as const,
    },
  ]

  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {insights.map((insight) => {
        const Icon = insight.icon

        return (
          <Card key={insight.title} className="border-border/70 bg-card py-0 shadow-none">
            <CardContent className="flex gap-3 px-4 py-3">
              <span className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border",
                insight.tone === "danger" ? "border-status-danger-border bg-status-danger-surface text-status-danger-text" : "border-status-success-border bg-status-success-surface text-status-success-text",
              )}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{insight.title}</p>
                <p className="mt-1 text-xl font-semibold leading-none tracking-tight">{insight.value}</p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{insight.detail}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}

// Señala lotes pendientes cuando el cierre se encuentra dentro de la ventana crítica.
export function SupervisorRiskMonitor({
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
    <Card className={cn("border-border/70 bg-card shadow-none", pendingNotStarted ? "border-l-4 border-l-destructive" : "border-l-4 border-l-success")}>
      <CardContent className="p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">Cuello de Botella</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Auditorías que todavía no comenzaron dentro de la ventana crítica de 15 días.
            </p>
          </div>
          <div className="text-left lg:text-right">
            <p className={cn("text-4xl font-semibold leading-none tracking-tight", pendingNotStarted ? "text-status-danger-text" : "text-status-success-text")}>{pendingNotStarted}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {isCriticalWindow ? "sin iniciar" : "fuera de ventana"}
            </p>
          </div>
        </div>
        {riskLotes.length > 0 && (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {riskLotes.map((lote) => (
              <div key={lote.id} className="flex items-center justify-between gap-3 rounded-md border border-status-danger-border bg-status-danger-surface px-3 py-2">
                <span className="truncate text-sm font-medium">{lote.unidadNombre}</span>
                <span className="text-sm font-semibold text-status-danger-text">{lote.counts.pending}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

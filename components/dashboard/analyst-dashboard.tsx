"use client"

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

const toneValueStyles = { neutral: "text-foreground", primary: "text-primary", success: "text-status-success-text", warning: "text-status-warning-text", danger: "text-status-danger-text" }

function KpiCard({ stat }: { stat: StatCard }) {
  return (
    <Card variant="surface" className="overflow-hidden py-0">
      <CardContent className="flex min-h-[5rem] flex-col justify-center gap-2 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{stat.title}</p>
        <p className={cn("text-3xl font-semibold leading-none tracking-tight", toneValueStyles[stat.tone])}>{stat.value}</p>
      </CardContent>
    </Card>
  )
}

function SemiGauge({
  value,
  label,
  size = "md",
}: {
  value: number
  label: string
  size?: "sm" | "md"
}) {
  const semaphore = getSemaphore(value)
  const radius = size === "sm" ? 72 : 80
  const circumference = Math.PI * radius
  const clampedValue = Math.max(0, Math.min(100, value))
  const arcPath = size === "sm" ? "M 18 90 A 72 72 0 0 1 162 90" : "M 10 90 A 80 80 0 0 1 170 90"

  return (
    <div className={cn("relative mx-auto", size === "sm" ? "h-28 w-44" : "h-[7.75rem] w-56")}>
      <svg viewBox="0 0 180 106" className="h-full w-full overflow-visible">
        <path
          d={arcPath}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={size === "sm" ? 14 : 16}
          className="text-muted"
        />
        <path
          d={arcPath}
          fill="none"
          stroke="currentColor"
          strokeDasharray={`${(clampedValue / 100) * circumference} ${circumference}`}
          strokeLinecap="round"
          strokeWidth={size === "sm" ? 14 : 16}
          className={semaphore.text}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-3 text-center">
        <p className={cn(size === "sm" ? "text-3xl" : "text-[2rem]", "font-semibold leading-none tracking-tight", semaphore.text)}>{value}%</p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  )
}

function AnalystProgressPanel({
  counts,
  lotes,
  className,
}: {
  counts: CountMetrics
  lotes: SupervisorLoteSummary[]
  className?: string
}) {
  const loteNames = lotes.map((lote) => lote.unidadNombre)

  return (
    <Card className={cn("overflow-hidden border border-border/70 bg-card py-0 shadow-none", className)}>
      <CardContent className="grid min-h-[7.5rem] gap-4 px-4 py-3 md:grid-cols-[minmax(0,1fr)_15rem] md:items-center">
        <div className="min-w-0 space-y-3">
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight">Progreso General de Controles</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Asignaciones activas del ciclo</p>
          </div>
          <div className="grid max-w-[31rem] gap-2 text-sm">
            <div className="grid items-baseline gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Lotes</span>
              <span className="min-w-0 truncate" title={loteNames.join(", ")}>
                <span className="font-semibold text-foreground">{lotes.length} activos</span>
                <span className="text-muted-foreground"> - {formatCompactList(loteNames, "Sin lotes activos")}</span>
              </span>
            </div>
            <div className="grid items-baseline gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Controles</span>
              <span>
                <span className="font-semibold text-foreground">{counts.total} totales</span>
                <span className="text-muted-foreground"> - {counts.started} con avance</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center md:justify-end md:pr-1">
          <SemiGauge value={counts.progressPct} label="avance" />
        </div>
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
            <TableHead>Unidad de Negocio</TableHead>
            <TableHead>Vertical</TableHead>
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
              <TableCell className="truncate pr-4 text-sm align-top">
                {control.unidadNombre}
              </TableCell>
              <TableCell className="truncate pr-4 text-sm align-top">{control.verticalNombre}</TableCell>
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

export { KpiCard, SemiGauge, AnalystProgressPanel, AnalystAssignedTable }


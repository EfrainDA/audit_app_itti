"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Building2,
  Users,
  FileCheck,
  Radar,
  ShieldCheck,
} from "lucide-react"
import {
  dashboardStats,
  mockUnidades,
  mockLotes,
  mockUsers,
  getEstadoBadgeColor,
  formatEstado,
} from "@/lib/data"
import { ProgressChart } from "./progress-chart"
import { ScoreByVerticalChart } from "./score-by-vertical-chart"
import { AuditoriasTable } from "./auditorias-table"

const statCards = [
  {
    title: "Auditorias Totales",
    value: dashboardStats.totalAuditorias,
    icon: ClipboardCheck,
    description: "En el ciclo actual",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "En Curso",
    value: dashboardStats.auditoriasEnCurso,
    icon: Clock,
    description: "Auditorias activas",
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
  },
  {
    title: "Terminadas",
    value: dashboardStats.auditoriasTerminadas,
    icon: CheckCircle2,
    description: "Completadas exitosamente",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Score Promedio",
    value: `${dashboardStats.scorePromedio}%`,
    icon: TrendingUp,
    description: "Del ciclo actual",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
]

export function DashboardContent() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-primary/10 bg-white/70 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(120deg,transparent,oklch(0.97_0.01_252/0.4),oklch(0.97_0.01_180/0.3))]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-primary/22 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/90">
              <Radar className="h-3.5 w-3.5" />
              Quality Intelligence
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Centro de mando de auditorias con precision operativa.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Supervisa ciclos, riesgo de cierre, desempeno por vertical y controles recientes en una vista de alta senal.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
            <div className="rounded-lg border border-border/70 bg-white/70 p-4 shadow-[0_10px_24px_oklch(0.28_0.025_252/0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ciclo activo</p>
              <p className="mt-2 text-2xl font-semibold text-primary">03</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-white/70 p-4 shadow-[0_10px_24px_rgba(0,0,0,0.02)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Estado</p>
              <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-accent">
                <ShieldCheck className="h-5 w-5" />
                Controlado
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border/70 bg-card/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{stat.title}</p>
                  <p className="mt-2 text-4xl font-semibold tracking-tight">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
                </div>
                <div className={`rounded-lg border border-current/15 p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Progreso del Ciclo</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressChart />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Score por Vertical</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreByVerticalChart />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockUnidades.length}</p>
                <p className="text-sm text-muted-foreground">Unidades de Negocio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg border border-chart-2/20 bg-chart-2/10 p-3">
                <Users className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockUsers.filter(u => u.role === "auditor").length}</p>
                <p className="text-sm text-muted-foreground">Auditores Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg border border-chart-3/20 bg-chart-3/10 p-3">
                <FileCheck className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockLotes.filter(l => l.estado === "abierto").length}</p>
                <p className="text-sm text-muted-foreground">Lotes Abiertos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Auditorias Recientes</CardTitle>
          <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
            Ciclo 3 - 2026
          </Badge>
        </CardHeader>
        <CardContent>
          <AuditoriasTable />
        </CardContent>
      </Card>

      <Card className="border-border/70 border-l-4 border-l-warning bg-card/80">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg border border-warning/25 bg-warning/10 p-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold">Monitor de Riesgo de Cierre</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Hay 2 auditorias pendientes con menos de 48 horas para el cierre del ciclo.
                Se recomienda priorizar la ejecucion de estas evaluaciones.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className={getEstadoBadgeColor("en_curso")}>
                  Sucursal Monterrey - {formatEstado("pendiente")}
                </Badge>
                <Badge className={getEstadoBadgeColor("en_replica")}>
                  Sucursal CDMX - {formatEstado("en_replica")}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

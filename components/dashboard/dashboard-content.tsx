"use client"
// Panel por rol derivado de los mismos datos para analistas, auditados, supervisores y dirección.
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ContentSkeleton, ErrorState } from "@/components/ui/async-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Crown,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
} from "lucide-react"
import {
  isCountableLote,
  type Ciclo,
  type Lote,
  type Respuesta,
} from "@/lib/data"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import {
  getActiveCycle,
  getCounts,
  getDaysUntil,
} from "@/features/dashboard/domain/metrics"
import { useExecutiveDashboard } from "@/features/dashboard/application/use-executive-dashboard"
import { DashboardCycleFilter } from "@/components/dashboard/dashboard-cycle-filter"
// Tipos intermedios para calcular métricas sin acoplarlas al JSX.
import { DashboardView, ControlContext, RoleDashboard, SupervisorAnalystSummary, CeoCycleSummary, LotSummaryIndexes, appendToIndex, buildLotSummary, buildParameterDistribution, ParameterDistribution, getControlCategory, getUniqueNonEmpty, findSimilarVerticalGroupKey, averageUnitScore } from "./dashboard-model"

import { KpiCard, AnalystProgressPanel, AnalystAssignedTable } from "./analyst-dashboard"

import { SupervisorCycleProgress, SupervisorCycleMeta, SupervisorFocusPanel, SupervisorLoteProgress, SupervisorAnalystAssignments, SupervisorInsightStrip, SupervisorRiskMonitor } from "./supervisor-dashboard"

import { CeoScoreCard, CeoMetricCard, CeoGroupHealth, CeoHistoricalChart, CeoRanking, CeoSemaphoreMatrix } from "./ceo-dashboard"
import { CeoParameterDistribution } from "./ceo-parameter-distribution"

const YEAR_KEY = "a\u00f1o"
type AuditedControlContext = ControlContext & { respuestas: Respuesta[] }

// Aplica filtros, deriva métricas y elige la vista correspondiente al rol.
export function DashboardContent() {
  const [activeView, setActiveView] = useState<DashboardView>("ceo")
  const [selectedCycleId, setSelectedCycleId] = useState("active")
  const [ceoEcosystemFilter, setCeoEcosystemFilter] = useState("all")
  const [ceoChartUnitFilter, setCeoChartUnitFilter] = useState("all")
  const [ceoChartVerticalFilter, setCeoChartVerticalFilter] = useState("all")
  const { appUser } = useAuth()
  const { data: appData, isLoading, error: dataError, refresh } = useAppData({
    domains: ["users", "settings", "models", "planning", "dashboard"],
  })
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

  const activeCycleOption = useMemo(() => getActiveCycle(ciclos), [ciclos])
  const selectedCycle = selectedCycleId === "active"
    ? activeCycleOption
    : ciclos.find((cycle) => cycle.id === selectedCycleId) ?? activeCycleOption
  // El panel ejecutivo usa una RPC agregada para no descargar filas detalladas.
  const executiveQuery = useExecutiveDashboard({
    cycleId: selectedCycle?.id,
    ecosystem: ceoEcosystemFilter === "all" ? undefined : ceoEcosystemFilter,
    enabled: appUser?.role === "ceo" || appUser?.role === "admin",
  })
  const dashboardCycleFilter = (
    <DashboardCycleFilter
      cycles={ciclos}
      activeCycle={activeCycleOption}
      value={selectedCycleId}
      onValueChange={(value) => {
        setSelectedCycleId(value)
        setCeoEcosystemFilter("all")
        setCeoChartUnitFilter("all")
        setCeoChartVerticalFilter("all")
      }}
    />
  )

  // Índices y métricas compartidas para las vistas operativas del dashboard.
  const metrics = useMemo(() => {
    const activeCycle = selectedCycleId === "active"
      ? activeCycleOption
      : ciclos.find((cycle) => cycle.id === selectedCycleId) ?? activeCycleOption
    const lotsByCycle = new Map<string, Lote[]>()
    lotes.forEach((lote) => {
      if (isCountableLote(lote)) appendToIndex(lotsByCycle, `${lote[YEAR_KEY]}:${lote.ciclo}`, lote)
    })
    const activeLotes = lotsByCycle.get(`${activeCycle[YEAR_KEY]}:${activeCycle.bimestre}`) ?? []
    const unitsById = new Map(unidades.map((unit) => [unit.id, unit]))
    const modelsById = new Map(modelos.map((model) => [model.id, model]))
    const lotsById = new Map(lotes.map((lot) => [lot.id, lot]))
    const answersByControlId = new Map<string, Respuesta[]>()
    respuestas.forEach((answer) => appendToIndex(answersByControlId, answer.controlId, answer))
    const lotVerticalsByLotId = new Map<string, typeof loteVerticales>()
    loteVerticales.forEach((lotVertical) => appendToIndex(lotVerticalsByLotId, lotVertical.loteId, lotVertical))
    const auditsByLotId = new Map<string, typeof auditorias>()
    auditorias.forEach((audit) => appendToIndex(auditsByLotId, audit.loteId, audit))
    const verticalMap = new Map<string, { id: string; name: string; weight: number }>()

    activeLotes.forEach((lote) => {
      const modelo = modelsById.get(lote.modeloControlId)
      modelo?.verticales.forEach((vertical) => {
        verticalMap.set(vertical.id, { id: vertical.id, name: vertical.nombre, weight: vertical.peso })
      })
    })

    const activeControls: ControlContext[] = activeLotes
      .flatMap((lote) => lotVerticalsByLotId.get(lote.id) ?? [])
      .flatMap((loteVertical) => {
        const lote = lotsById.get(loteVertical.loteId)
        const unidad = lote ? unitsById.get(lote.unidadNegocioId) : undefined
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
          etiqueta: control.etiqueta,
          proceso: control.proceso,
          subproceso: control.subproceso,
          producto: control.producto,
          productosVinculados: control.productosVinculados,
          correspondeProceso: control.correspondeProceso,
          fechaCreacion: control.fechaCreacion,
        }))
      })

    const activeAuditoriasFallback: ControlContext[] = activeLotes
      .flatMap((lote) => auditsByLotId.get(lote.id) ?? [])
      .map((auditoria) => ({
        id: auditoria.controlId,
        estado: auditoria.estado === "terminada" ? "terminado" : auditoria.estado,
        scoreControl: auditoria.scoreTotal,
        auditorId: auditoria.auditorId,
        loteId: auditoria.loteId,
        unidadNombre: "N/A",
        verticalId: "fallback",
        verticalNombre: "Auditorías",
        verticalPeso: 100,
        fechaCreacion: auditoria.fecha,
      }))

    const allControls = activeControls.length ? activeControls : activeAuditoriasFallback
    const controlsByAuditorId = new Map<string, ControlContext[]>()
    allControls.forEach((control) => {
      if (control.auditorId) appendToIndex(controlsByAuditorId, control.auditorId, control)
    })
    const auditedControlIds = new Set(
      respuestas
        .filter((answer) => (answer.personasAuditadas?.length ?? 0) > 0)
        .map((answer) => answer.controlId),
    )
    const auditedControls: AuditedControlContext[] = allControls
      .filter((control) => auditedControlIds.has(control.id))
      .filter((control) => control.estado === "en_replica" || control.estado === "terminado" || control.estado === "terminada")
      .map((control) => ({
        ...control,
        respuestas: (answersByControlId.get(control.id) ?? []).filter((answer) =>
          answer.controlId === control.id &&
          (answer.personasAuditadas?.length ?? 0) > 0
        ),
      }))
    const analystAuditorId = isAuditor ? appUser?.id : users.find((user) => user.role === "auditor")?.id
    const analystControls = allControls.filter((control) => control.auditorId === analystAuditorId)
    const analystAssignedLotes = activeLotes.filter((lote) => analystAuditorId ? lote.auditores.includes(analystAuditorId) : false)
    const analystAssignedLoteIds = analystAssignedLotes.map((lote) => lote.id)
    const analystAssignedLoteIdSet = new Set(analystAssignedLoteIds)
    const coveragePct = unidades.length
      ? Math.round((new Set(activeLotes.map((lote) => lote.unidadNegocioId)).size / unidades.length) * 100)
      : 0
    const answeredControlIds = new Set(respuestas.map((answer) => answer.controlId))
    const globalCounts = getCounts(allControls, answeredControlIds)
    const analystCounts = getCounts(analystControls, answeredControlIds)
    const assignedLotControls = allControls.filter((control) => analystAssignedLoteIdSet.has(control.loteId))
    const assignedLotCounts = getCounts(assignedLotControls, answeredControlIds)
    const analystOpenControls = analystControls.filter((control) => control.estado !== "terminado" && control.estado !== "terminada")
    const supervisorAnalystSummaries: SupervisorAnalystSummary[] = users
      .filter((user) => user.role === "auditor")
      .map((auditor) => {
        const assignedControls = controlsByAuditorId.get(auditor.id) ?? []
        const counts = getCounts(assignedControls, answeredControlIds)

        return {
          id: auditor.id,
          name: auditor.name,
          assigned: counts.total,
          advance: counts.inCourse + counts.completed,
          inCourse: counts.inCourse,
          completed: counts.completed,
          pending: counts.pending,
          progressPct: counts.progressPct,
        }
      })
    const controlsByLotId = new Map<string, ControlContext[]>()
    allControls.forEach((control) => appendToIndex(controlsByLotId, control.loteId, control))
    const summaryIndexes: LotSummaryIndexes = {
      unitsById,
      modelsById,
      controlsByLotId,
      answersByControlId,
      answeredControlIds,
    }
    const supervisorLoteSummaries = activeLotes.map((lote) => buildLotSummary(lote, summaryIndexes))
    const buildCycleSummary = (cycle: Ciclo): CeoCycleSummary => {
      const cycleLotes = lotsByCycle.get(`${cycle[YEAR_KEY]}:${cycle.bimestre}`) ?? []
      const cycleVerticalMap = new Map<string, { id: string; name: string; weight: number }>()

      cycleLotes.forEach((lote) => {
        const modelo = modelsById.get(lote.modeloControlId)
        modelo?.verticales.forEach((vertical) => {
          cycleVerticalMap.set(vertical.id, { id: vertical.id, name: vertical.nombre, weight: vertical.peso })
        })
      })

      const cycleControls: ControlContext[] = cycleLotes
        .flatMap((lote) => lotVerticalsByLotId.get(lote.id) ?? [])
        .flatMap((loteVertical) => {
          const lote = lotsById.get(loteVertical.loteId)
          const unidad = lote ? unitsById.get(lote.unidadNegocioId) : undefined
          const vertical = cycleVerticalMap.get(loteVertical.verticalId)

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
            etiqueta: control.etiqueta,
            proceso: control.proceso,
            subproceso: control.subproceso,
            producto: control.producto,
            productosVinculados: control.productosVinculados,
            correspondeProceso: control.correspondeProceso,
            fechaCreacion: control.fechaCreacion,
          }))
        })
      const cycleFallbackControls: ControlContext[] = cycleLotes
        .flatMap((lote) => auditsByLotId.get(lote.id) ?? [])
        .map((auditoria) => ({
          id: auditoria.controlId,
          estado: auditoria.estado === "terminada" ? "terminado" : auditoria.estado,
          scoreControl: auditoria.scoreTotal,
          auditorId: auditoria.auditorId,
          loteId: auditoria.loteId,
          unidadNombre: "N/A",
          verticalId: "fallback",
          verticalNombre: "Auditorías",
          verticalPeso: 100,
          fechaCreacion: auditoria.fecha,
        }))
      const cycleAllControls = cycleControls.length ? cycleControls : cycleFallbackControls
      const cycleControlsByLotId = new Map<string, ControlContext[]>()
      cycleAllControls.forEach((control) => appendToIndex(cycleControlsByLotId, control.loteId, control))
      const cycleSummaries = cycleLotes.map((lote) => buildLotSummary(lote, {
        unitsById,
        modelsById,
        controlsByLotId: cycleControlsByLotId,
        answersByControlId,
        answeredControlIds,
      }))

      return {
        id: cycle.id,
        label: `C${cycle.bimestre}`,
        lotes: cycleSummaries,
      }
    }
    const cycleSummaries = [...ciclos]
      .sort((first, second) => new Date(first.fechaInicio).getTime() - new Date(second.fechaInicio).getTime())
      .map(buildCycleSummary)
      .filter((cycle) => cycle.lotes.length > 0)
    const activeCycleIndex = cycleSummaries.findIndex((cycle) => cycle.id === activeCycle.id)
    const lastCycleSummaries = (activeCycleIndex >= 0
      ? cycleSummaries.slice(Math.max(0, activeCycleIndex - 2), activeCycleIndex + 1)
      : cycleSummaries.slice(-3)
    )

    return {
      activeCycle,
      activeLotes,
      allControls,
      unassignedControls: allControls.filter((control) => !control.auditorId).length,
      auditedControls,
      analystControls,
      analystOpenControls,
      globalCounts,
      analystCounts,
      assignedLotCounts,
      analystAssignedLoteIds,
      supervisorLoteSummaries,
      supervisorAnalystSummaries,
      daysToCycleClose: getDaysUntil(activeCycle.fechaFin),
      coveragePct,
      activeCycleYear: String(activeCycle[YEAR_KEY]),
      progressLabel: `${globalCounts.started}/${globalCounts.total || 0}`,
      cycleSummaries: lastCycleSummaries,
    }
  }, [activeCycleOption, appUser?.id, auditorias, ciclos, isAuditor, loteVerticales, lotes, modelos, respuestas, selectedCycleId, unidades, users])

  // Ensambla la configuración visual de cada rol a partir de las mismas métricas.
  const roleDashboards = useMemo<Record<DashboardView, RoleDashboard>>(() => {
    const supervisorCounts = metrics.globalCounts
    const ceoCounts = metrics.globalCounts
    const analystCounts = metrics.analystCounts

    return {
      analista: {
        cards: [
          {
            title: "Controles Asignados",
            value: analystCounts.total,
            tone: "neutral",
          },
          {
            title: "En curso",
            value: analystCounts.inCourse,
            tone: "primary",
          },
          {
            title: "Terminados",
            value: analystCounts.completed,
            tone: "success",
          },
          {
            title: "Pendientes",
            value: analystCounts.pending,
            tone: "danger",
          },
        ],
      },
      supervisor: {
        cards: [
          {
            title: "Avance Equipo",
            value: `${supervisorCounts.progressPct}%`,
            tone: "primary",
          },
          {
            title: "Lotes Abiertos",
            value: metrics.activeLotes.filter((lote) => lote.estado === "abierto").length,
            tone: "success",
          },
          {
            title: "Pendientes",
            value: supervisorCounts.pending,
            tone: supervisorCounts.pending ? "warning" : "success",
          },
          {
            title: "Score Equipo",
            value: `${supervisorCounts.score}%`,
            tone: supervisorCounts.score >= 80 ? "success" : "warning",
          },
        ],
      },
      ceo: {
        cards: [
          {
            title: "Cobertura Ciclo",
            value: `${metrics.coveragePct}%`,
            tone: "primary",
          },
          {
            title: "Progreso General",
            value: metrics.progressLabel,
            tone: "success",
          },
          {
            title: "Score Ejecutivo",
            value: `${ceoCounts.score}%`,
            tone: ceoCounts.score >= 80 ? "success" : "warning",
          },
          {
            title: "Riesgo Residual",
            value: ceoCounts.risk,
            tone: ceoCounts.risk ? "danger" : "success",
          },
        ],
      },
    }
  }, [metrics])

  const dashboardView: DashboardView = isAuditor ? "analista" : isSupervisor ? "supervisor" : activeView
  const activeDashboard = roleDashboards[dashboardView]

  if (isLoading) {
    return <ContentSkeleton variant="dashboard" label="Cargando dashboard" />
  }

  if (dataError) {
    return <ErrorState description={dataError} onRetry={() => void refresh()} />
  }

  if (dashboardView === "analista") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {!isAuditor && !isSupervisor && (
            <Tabs value={dashboardView} onValueChange={(value) => setActiveView(value as DashboardView)} className="min-w-0">
              <TabsList className="responsive-scroll flex w-full justify-start gap-1 overflow-x-auto bg-secondary sm:grid sm:w-fit sm:grid-cols-3 sm:overflow-visible">
                <TabsTrigger value="analista" className="flex items-center gap-2"><UserCheck className="h-4 w-4" />Auditor</TabsTrigger>
                <TabsTrigger value="supervisor" className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Supervisor</TabsTrigger>
                <TabsTrigger value="ceo" className="flex items-center gap-2"><Crown className="h-4 w-4" />CEO</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <div className="ml-auto w-full sm:w-auto">
            {dashboardCycleFilter}
          </div>
        </div>

        <section className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <AnalystProgressPanel counts={metrics.assignedLotCounts} lotes={metrics.supervisorLoteSummaries.filter((lote) =>
            metrics.analystAssignedLoteIds.includes(lote.id)
          )} />

          <Card className="overflow-hidden border border-border/70 bg-card py-0 shadow-none">
            <CardContent className="grid h-full min-h-[8.25rem] grid-rows-2 divide-y divide-border/60 p-0">
              <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Ciclo activo</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metrics.activeCycleYear}</p>
                </div>
                <p className="shrink-0 text-3xl font-semibold leading-none tracking-tight text-primary">{String(metrics.activeCycle.bimestre).padStart(2, "0")}</p>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Cierre</p>
                  <p className="mt-1 text-xs text-muted-foreground">días restantes</p>
                </div>
                <p className="shrink-0 text-3xl font-semibold leading-none tracking-tight text-status-warning-text">{metrics.daysToCycleClose}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {activeDashboard.cards.map((stat) => (
            <KpiCard key={stat.title} stat={stat} />
          ))}
        </section>

        <Card className="border-border/70 bg-card py-0 shadow-none">
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
      .map((auditor) => auditor.name)
    const bottleneckPending = metrics.daysToCycleClose <= 15 ? metrics.globalCounts.pending : 0

    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {!isAuditor && !isSupervisor && (
            <Tabs value={dashboardView} onValueChange={(value) => setActiveView(value as DashboardView)} className="min-w-0">
              <TabsList className="responsive-scroll flex w-full justify-start gap-1 overflow-x-auto bg-secondary sm:grid sm:w-fit sm:grid-cols-3 sm:overflow-visible">
                <TabsTrigger value="analista" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Auditor
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
          <div className="ml-auto w-full sm:w-auto">
            {dashboardCycleFilter}
          </div>
        </div>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_15rem]">
          <SupervisorCycleProgress counts={metrics.globalCounts} />
          <SupervisorCycleMeta
            cycleNumber={String(metrics.activeCycle.bimestre).padStart(2, "0")}
            cycleYear={metrics.activeCycleYear}
            daysToClose={metrics.daysToCycleClose}
          />
        </section>

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <SupervisorFocusPanel
            lotes={metrics.supervisorLoteSummaries}
            unassignedControls={metrics.unassignedControls}
          />
          <SupervisorAnalystAssignments analysts={metrics.supervisorAnalystSummaries} />
        </section>

        <SupervisorInsightStrip
          finishedAuditors={finishedAuditors}
          bottleneckPending={bottleneckPending}
          daysToClose={metrics.daysToCycleClose}
        />

        <SupervisorLoteProgress lotes={metrics.supervisorLoteSummaries} />

        <SupervisorRiskMonitor lotes={metrics.supervisorLoteSummaries} daysToClose={metrics.daysToCycleClose} />
      </div>
    )
  }

  const ceoEcosystemOptions = Array.from(
    new Set(metrics.supervisorLoteSummaries.map((lote) => lote.unidadEcosistema).filter(Boolean)),
  ).sort((first, second) => first.localeCompare(second))
  const ceoFilteredLotes = ceoEcosystemFilter === "all"
    ? metrics.supervisorLoteSummaries
    : metrics.supervisorLoteSummaries.filter((lote) => lote.unidadEcosistema === ceoEcosystemFilter)
  const ceoUnitOptions = Array.from(
    new Map(
      ceoFilteredLotes
        .filter((lote) => lote.unidadNegocioId)
        .map((lote) => [lote.unidadNegocioId!, { id: lote.unidadNegocioId!, name: lote.unidadNombre }]),
    ).values(),
  )
  const ceoFilteredLoteIds = new Set(ceoFilteredLotes.map((lote) => lote.id))
  const ceoFilteredControls = metrics.allControls.filter((control) => ceoFilteredLoteIds.has(control.loteId))
  const ceoCurrentScore = averageUnitScore(ceoFilteredLotes)
  const previousCycle = metrics.cycleSummaries.length > 1 ? metrics.cycleSummaries[metrics.cycleSummaries.length - 2] : null
  const previousLotes = previousCycle
    ? ceoEcosystemFilter === "all"
      ? previousCycle.lotes
      : previousCycle.lotes.filter((lote) => lote.unidadEcosistema === ceoEcosystemFilter)
    : []
  const ceoPreviousScore = previousCycle ? averageUnitScore(previousLotes) : ceoCurrentScore
  const ceoDelta = ceoCurrentScore !== null && ceoPreviousScore !== null ? ceoCurrentScore - ceoPreviousScore : null
  // Unifica nombres equivalentes antes de alimentar los filtros ejecutivos.
  const ceoVerticalOptionMap = new Map<string, { id: string; name: string }>()
  ceoFilteredLotes.forEach((lote) => {
    lote.verticalScores.forEach((vertical) => {
      const key = findSimilarVerticalGroupKey(ceoVerticalOptionMap.keys(), vertical.name)
      if (!ceoVerticalOptionMap.has(key)) {
        ceoVerticalOptionMap.set(key, { id: key, name: vertical.name })
      }
    })
  })
  const ceoVerticalOptions = Array.from(ceoVerticalOptionMap.values())
  const productCount = getUniqueNonEmpty(
    ceoFilteredControls
      .filter((control) => getControlCategory(control) === "producto")
      .flatMap((control) => [control.producto, ...(control.productosVinculados ?? [])]),
  ) || ceoFilteredControls.filter((control) => getControlCategory(control) === "producto").length
  const processCount = getUniqueNonEmpty(
    ceoFilteredControls
      .filter((control) => getControlCategory(control) === "proceso")
      .flatMap((control) => [control.proceso, control.subproceso]),
  ) || ceoFilteredControls.filter((control) => getControlCategory(control) === "proceso").length
  const unitCount = ceoFilteredLotes.length
  const { distribution: localParameterDistribution, details: parameterDistributionDetails } = buildParameterDistribution(ceoFilteredLotes)
  // La RPC tiene prioridad; los cálculos locales quedan como respaldo compatible.
  const aggregateTotals = executiveQuery.data?.totals
  const parameterDistribution: ParameterDistribution = aggregateTotals
    ? {
        cumple: Number(aggregateTotals.cumple),
        intermedio: Number(aggregateTotals.intermedio),
        noCumple: Number(aggregateTotals.no_cumple),
        total: Number(aggregateTotals.cumple) + Number(aggregateTotals.intermedio) + Number(aggregateTotals.no_cumple),
      }
    : localParameterDistribution
  const effectiveChartUnitFilter = ceoChartUnitFilter

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {!isAuditor && !isSupervisor && (
          <Tabs value={dashboardView} onValueChange={(value) => setActiveView(value as DashboardView)} className="min-w-0">
            <TabsList className="responsive-scroll flex w-full justify-start gap-1 overflow-x-auto bg-secondary sm:grid sm:w-fit sm:grid-cols-3 sm:overflow-visible">
              <TabsTrigger value="analista" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Auditor
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
        <div className="ml-auto w-full sm:w-auto">
          {dashboardCycleFilter}
        </div>
      </div>

      <Card className="border-border/70 bg-card py-0 shadow-none">
        <CardContent className="flex flex-col gap-2 px-3 py-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Filtro Ejecutivo</p>
            </div>
          </div>
          <Select value={ceoEcosystemFilter} onValueChange={(value) => {
            setCeoEcosystemFilter(value)
            setCeoChartUnitFilter("all")
          }}>
            <SelectTrigger className="h-9 w-full border-border bg-secondary/70 md:w-[18rem]">
              <SelectValue placeholder="Ecosistema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los ecosistemas</SelectItem>
              {ceoEcosystemOptions.map((ecosystem) => (
                <SelectItem key={ecosystem} value={ecosystem}>{ecosystem}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CeoScoreCard score={ceoCurrentScore} delta={ceoDelta} thresholds={appData.umbrales} />
        <CeoMetricCard title="Unidades de negocio evaluadas" value={unitCount} detail={ceoFilteredLotes.map((lote) => lote.unidadNombre).join(", ") || "Sin unidades evaluadas"} />
        <CeoMetricCard title="Productos evaluados" value={productCount} detail="Controles clasificados como producto" />
        <CeoMetricCard title="Procesos evaluados" value={processCount} detail="Procesos y subprocesos auditados" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
        <CeoGroupHealth score={ceoCurrentScore} lotes={ceoFilteredLotes} thresholds={appData.umbrales} />
        <CeoRanking lotes={ceoFilteredLotes} thresholds={appData.umbrales} />
      </section>

      <CeoSemaphoreMatrix lotes={ceoFilteredLotes} thresholds={appData.umbrales} />

      <CeoHistoricalChart
        history={metrics.cycleSummaries}
        selectedUnitId={effectiveChartUnitFilter}
        onSelectedUnitIdChange={setCeoChartUnitFilter}
        selectedVerticalId={ceoChartVerticalFilter}
        onSelectedVerticalIdChange={setCeoChartVerticalFilter}
        unitOptions={ceoUnitOptions}
        verticalOptions={ceoVerticalOptions}
        thresholds={appData.umbrales}
        unitLocked={false}
      />

      <CeoParameterDistribution distribution={parameterDistribution} details={parameterDistributionDetails} />
    </div>
  )
}

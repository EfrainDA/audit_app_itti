"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
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
  FileText,
  Layers,
  MessageSquare,
  Paperclip,
  Play,
  Save,
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
  getScoreColor,
  isCountableLote,
  type Ciclo,
  type Respuesta,
} from "@/lib/data"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import { saveAuditedResponseNote } from "@/lib/supabase-data"
import { getErrorMessage } from "@/lib/error-message"

type DashboardView = "analista" | "auditado" | "supervisor" | "ceo"

const YEAR_KEY = "a\u00f1o"

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
  etiqueta?: string
  proceso?: string
  subproceso?: string
  producto?: string
  productosVinculados?: string[]
  correspondeProceso?: boolean
  fechaCreacion: string
}

type AuditedControlContext = ControlContext & {
  respuestas: Respuesta[]
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
}

type StatCard = {
  title: string
  value: string | number
  tone: "primary" | "success" | "warning" | "danger" | "neutral"
}

type RoleDashboard = {
  cards: StatCard[]
}

type SupervisorVerticalScore = {
  id: string
  name: string
  weight: number
  total: number
  advance: number
  pending: number
  completed: number
  progressPct: number
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
    etiqueta?: string
    proceso?: string
    subproceso?: string
    producto?: string
    productosVinculados?: string[]
    correspondeProceso?: boolean
  }[]
}

type SupervisorLoteSummary = {
  id: string
  unidadNegocioId?: string
  unidadNombre: string
  unidadLogo?: string
  modeloNombre: string
  estado: string
  counts: CountMetrics
  progressPct: number
  unitScore: number | null
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
  inCourse: number
  completed: number
  pending: number
  progressPct: number
}

type CeoCycleSummary = {
  id: string
  label: string
  lotes: SupervisorLoteSummary[]
}

type ParameterDistribution = {
  total: number
  cumple: number
  intermedio: number
  noCumple: number
}

type CeoSemaphoreColumn = {
  id: string
  label: string
  weight: number | null
  getScore: (lote: SupervisorLoteSummary) => number | null
  getToneScore?: (lote: SupervisorLoteSummary) => number | null
  hasVertical: (lote: SupervisorLoteSummary) => boolean
}

type CeoComparedCycle = {
  id: string
  label: string
  lote?: SupervisorLoteSummary
}

type CeoCycleVerticalDetail = {
  key: string
  name: string
  weight: number
  achieved: number | null
  controls: {
    key: string
    label: string
    achieved: number | null
    allocation: number
  }[]
}

const EXECUTIVE_SCORE = {
  critical: 60,
  optimal: 85,
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
    [YEAR_KEY]: year,
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
  const completed = controls.filter((control) => control.estado === "terminado" || control.estado === "terminada").length
  const inCourse = controls.filter((control) => {
    if (control.estado === "terminado" || control.estado === "terminada") return false
    return control.estado === "en_curso" || control.estado === "en_replica" || answeredControlIds.has(control.id)
  }).length
  const pending = controls.filter((control) => {
    if (control.estado === "terminado" || control.estado === "terminada") return false
    return !(control.estado === "en_curso" || control.estado === "en_replica" || answeredControlIds.has(control.id))
  }).length
  const started = inCourse + completed
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
  }
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
      text: "text-success",
      bg: "bg-success",
    }
  }

  if (progress >= 50) {
    return {
      text: "text-warning",
      bg: "bg-warning",
    }
  }

  return {
    text: "text-destructive",
    bg: "bg-destructive",
  }
}

function getExecutiveScoreTone(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return {
      label: "Sin dato",
      text: "text-muted-foreground",
      bg: "bg-muted",
      soft: "bg-muted/20",
      border: "border-border/60",
      fill: "var(--muted-foreground)",
    }
  }

  const value = score ?? 0

  if (value >= EXECUTIVE_SCORE.optimal) {
    return {
      label: "Optimo",
      text: "text-success",
      bg: "bg-success",
      soft: "bg-success/10",
      border: "border-success/30",
      fill: "var(--success)",
    }
  }

  if (value >= EXECUTIVE_SCORE.critical) {
    return {
      label: "Aceptable",
      text: "text-warning",
      bg: "bg-warning",
      soft: "bg-warning/10",
      border: "border-warning/30",
      fill: "var(--warning)",
    }
  }

  return {
    label: "Critico",
    text: "text-destructive",
    bg: "bg-destructive",
    soft: "bg-destructive/10",
    border: "border-destructive/30",
    fill: "var(--destructive)",
  }
}

function getControlCategory(control: ControlContext) {
  const proceso = `${control.proceso ?? ""} ${control.subproceso ?? ""}`.trim()
  const etiqueta = control.etiqueta?.toLowerCase() ?? ""
  const vertical = control.verticalNombre.toLowerCase()
  const isProductControl = etiqueta.includes("producto")
  const isProcessControl = etiqueta.includes("proceso")

  if (isProductControl) return "producto"
  if (isProcessControl) return "proceso"
  if (vertical.includes("producto") || control.producto || control.productosVinculados?.length) return "producto"
  if (vertical.includes("proceso") || proceso || control.correspondeProceso) return "proceso"

  return "unidad"
}

function getSummaryControlCategory(control: SupervisorVerticalScore["controls"][number], verticalName: string) {
  const proceso = `${control.proceso ?? ""} ${control.subproceso ?? ""}`.trim()
  const etiqueta = control.etiqueta?.toLowerCase() ?? ""
  const vertical = verticalName.toLowerCase()
  const isProductControl = etiqueta.includes("producto")
  const isProcessControl = etiqueta.includes("proceso")

  if (isProductControl) return "producto"
  if (isProcessControl) return "proceso"
  if (vertical.includes("producto") || control.producto || control.productosVinculados?.length) return "producto"
  if (vertical.includes("proceso") || proceso || control.correspondeProceso) return "proceso"

  return "unidad"
}

function getControlProductLabels(control: SupervisorVerticalScore["controls"][number]) {
  const products = [control.producto, ...(control.productosVinculados ?? [])]
    .map((product) => product?.trim())
    .filter((product): product is string => Boolean(product))

  return products.length ? products : [control.identificador ?? "Producto sin nombre"]
}

function getControlProcessLabel(control: SupervisorVerticalScore["controls"][number]) {
  return control.proceso?.trim() || control.subproceso?.trim() || control.identificador || "Proceso sin nombre"
}

function getUniqueNonEmpty(values: (string | undefined)[]) {
  return new Set(values.map((value) => value?.trim()).filter(Boolean)).size
}

function normalizeComparableName(value: string) {
  const stopWords = new Set(["de", "del", "la", "el", "los", "las", "y", "por", "para"])
  const aliases: Record<string, string> = {
    un: "unidad",
    uns: "unidad",
    proc: "proceso",
    unidades: "unidad",
    negocios: "negocio",
    productos: "producto",
    procesos: "proceso",
    apoyos: "apoyo",
    misionales: "misional",
    transversales: "transversal",
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word && !stopWords.has(word))
    .map((word) => aliases[word] ?? (word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word))
    .sort()
    .join(" ")
}

function getVerticalGroupKey(name: string) {
  return normalizeComparableName(name) || name.trim().toLowerCase()
}

function areVerticalGroupKeysSimilar(first: string, second: string) {
  if (first === second) return true

  const firstTokens = first.split(" ").filter(Boolean)
  const secondTokens = second.split(" ").filter(Boolean)
  const overlap = firstTokens.filter((token) => secondTokens.includes(token)).length
  const longestLength = Math.max(firstTokens.length, secondTokens.length)

  return longestLength > 0 && overlap / longestLength >= 0.8
}

function findSimilarVerticalGroupKey(keys: Iterable<string>, name: string) {
  const key = getVerticalGroupKey(name)
  return Array.from(keys).find((existingKey) => areVerticalGroupKeysSimilar(existingKey, key)) ?? key
}

function averageUnitScore(lotes: SupervisorLoteSummary[]) {
  const scored = lotes.filter((lote): lote is SupervisorLoteSummary & { unitScore: number } => lote.unitScore !== null)
  return scored.length ? Math.round(scored.reduce((sum, lote) => sum + lote.unitScore, 0) / scored.length) : null
}

function formatScore(value: number | null | undefined) {
  return value !== null && value !== undefined ? `${value}%` : "S/D"
}

function formatCompactList(values: string[], emptyLabel = "Sin datos") {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)))
  if (uniqueValues.length === 0) return emptyLabel
  if (uniqueValues.length <= 3) return uniqueValues.join(", ")
  return `${uniqueValues.slice(0, 3).join(", ")} +${uniqueValues.length - 3}`
}

function getControlDetailLabel(control: SupervisorVerticalScore["controls"][number], verticalName: string) {
  const category = getSummaryControlCategory(control, verticalName)

  if (category === "producto") return getControlProductLabels(control).join(", ")
  if (category === "proceso") return getControlProcessLabel(control)

  return control.identificador || "Control sin nombre"
}

function buildCeoCycleVerticalDetails(lote: SupervisorLoteSummary | undefined, selectedVerticalId: string): CeoCycleVerticalDetail[] {
  if (!lote) return []

  return lote.verticalScores
    .filter((vertical) => selectedVerticalId === "all" || areVerticalGroupKeysSimilar(getVerticalGroupKey(vertical.name), selectedVerticalId))
    .map((vertical) => {
      const controlAllocation = vertical.controls.length ? vertical.weight / vertical.controls.length : 0

      return {
        key: vertical.id,
        name: vertical.name,
        weight: vertical.weight,
        achieved: vertical.achieved,
        controls: vertical.controls.map((control) => ({
          key: control.id,
          label: getControlDetailLabel(control, vertical.name),
          achieved: control.scoreControl !== undefined ? Number(((control.scoreControl * controlAllocation) / 100).toFixed(1)) : null,
          allocation: Number(controlAllocation.toFixed(1)),
        })),
      }
    })
}

function formatDelta(delta: number | null) {
  if (delta === null) return "-"
  const sign = delta > 0 ? "+" : ""
  return `${sign}${delta} pts`
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
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
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
    <Card className={cn("overflow-hidden border border-border/70 bg-card py-0 shadow-none hover:shadow-none", className)}>
      <CardContent className="grid min-h-[7.5rem] gap-4 px-4 py-3 md:grid-cols-[minmax(0,1fr)_15rem] md:items-center">
        <div className="min-w-0 space-y-3">
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight">Progreso General de Controles</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Asignaciones activas del ciclo.</p>
          </div>
          <div className="grid max-w-[31rem] gap-2 text-sm">
            <div className="grid items-baseline gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Lotes</span>
              <span className="min-w-0 truncate" title={loteNames.join(", ")}>
                <span className="font-semibold text-foreground">{lotes.length} activos</span>
                <span className="text-muted-foreground"> - {formatCompactList(loteNames, "Sin lotes activos")}</span>
              </span>
            </div>
            <div className="grid items-baseline gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Controles</span>
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
            <TableHead className="text-left">Accion</TableHead>
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

const auditedEvidenceAccept = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,image/*"

function AuditedDashboard({
  controls,
  onSaved,
}: {
  controls: AuditedControlContext[]
  onSaved: () => Promise<void>
}) {
  const [selectedControlId, setSelectedControlId] = useState<string | null>(controls[0]?.id ?? null)
  const [openAnswerId, setOpenAnswerId] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<Record<string, File[]>>({})
  const [savingAnswerId, setSavingAnswerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const selectedControl = controls.find((control) => control.id === selectedControlId) ?? controls[0]
  const completedAnswers = controls.flatMap((control) => control.respuestas).filter((answer) => answer.descargosAuditado?.length).length

  useEffect(() => {
    if (!selectedControlId && controls[0]?.id) setSelectedControlId(controls[0].id)
    if (selectedControlId && !controls.some((control) => control.id === selectedControlId)) {
      setSelectedControlId(controls[0]?.id ?? null)
    }
  }, [controls, selectedControlId])

  const handleSave = async (answerId: string) => {
    setError(null)
    setSavingAnswerId(answerId)

    try {
      await saveAuditedResponseNote(answerId, {
        comment: comments[answerId],
        files: files[answerId] ?? [],
      })
      setComments((prev) => ({ ...prev, [answerId]: "" }))
      setFiles((prev) => ({ ...prev, [answerId]: [] }))
      setOpenAnswerId(null)
      await onSaved()
    } catch (saveError) {
      setError(getErrorMessage(saveError, "No se pudo guardar el descargo."))
    } finally {
      setSavingAnswerId(null)
    }
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard stat={{ title: "Controles recibidos", value: controls.length, tone: "primary" }} />
        <KpiCard stat={{ title: "En replica", value: controls.filter((control) => control.estado === "en_replica").length, tone: "warning" }} />
        <KpiCard stat={{ title: "Con descargo", value: completedAnswers, tone: completedAnswers ? "success" : "neutral" }} />
      </section>

      {error && (
        <Card className="border-destructive/25 bg-destructive/10 py-0 shadow-none">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <section className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Card className="border-border/70 bg-card py-0 shadow-none">
          <CardHeader className="px-4 pb-2 pt-4">
            <CardTitle className="text-base font-semibold">Controles asignados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4 pt-0">
            {controls.map((control) => (
              <button
                key={control.id}
                type="button"
                onClick={() => setSelectedControlId(control.id)}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-left transition-colors",
                  selectedControl?.id === control.id ? "border-primary/60 bg-primary/10" : "border-border/60 bg-background hover:bg-secondary/50",
                )}
              >
                <span className="block truncate text-sm font-semibold text-foreground">{control.identificador || control.id}</span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">{control.unidadNombre} | {control.verticalNombre}</span>
                <Badge className={cn("mt-2 h-5 px-2 text-[10px]", getEstadoBadgeColor(control.estado))}>{formatEstado(control.estado)}</Badge>
              </button>
            ))}
            {controls.length === 0 && (
              <div className="rounded-md border border-dashed border-border/70 px-3 py-8 text-center text-sm text-muted-foreground">
                No tenes controles recibidos por replica.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card py-0 shadow-none">
          <CardHeader className="px-4 pb-2 pt-4">
            <CardTitle className="text-base font-semibold">{selectedControl?.identificador ?? "Detalle del control"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            {!selectedControl ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Selecciona un control para ver sus respuestas.</div>
            ) : (
              selectedControl.respuestas.map((answer, index) => {
                const isOpen = openAnswerId === answer.id
                const answerFiles = files[answer.id] ?? []
                const notes = answer.descargosAuditado ?? []

                return (
                  <div key={answer.id} className="rounded-md border border-border/60 bg-background px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs font-semibold">Parámetro {index + 1}</span>
                      <Badge variant="outline" className="h-5 px-2 text-[10px]">{formatEstado(answer.valor)}</Badge>
                    </div>
                    {answer.comentario && (
                      <div className="mt-3 rounded-md border border-border/50 bg-secondary/20 px-3 py-2 text-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Comentario del auditor</p>
                        <p className="mt-1 text-foreground">{answer.comentario}</p>
                      </div>
                    )}
                    <div className="mt-3 rounded-md border border-border/50 bg-secondary/20 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <Paperclip className="h-3.5 w-3.5" />
                        Evidencia del auditor
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-foreground">
                        {answer.evidencias.length ? answer.evidencias.map((evidence) => (
                          <span key={evidence} className="flex min-w-0 items-center gap-2">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{evidence}</span>
                          </span>
                        )) : <span className="text-muted-foreground">Sin evidencias registradas.</span>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 px-2 text-xs text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => setOpenAnswerId(isOpen ? null : answer.id)}
                      >
                        <MessageSquare className="mr-1 h-3.5 w-3.5" />
                        Agregar descargo
                      </Button>
                    </div>

                    {notes.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {notes.map((note) => (
                          <div key={note.id} className="rounded-md border border-success/20 bg-success/10 px-3 py-2 text-xs">
                            {note.comentario && <p className="text-foreground">{note.comentario}</p>}
                            {note.evidencia && <p className="mt-1 text-muted-foreground">Evidencia: {note.evidencia}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {isOpen && (
                      <div className="mt-3 space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                        <Textarea
                          value={comments[answer.id] ?? ""}
                          onChange={(event) => setComments((prev) => ({ ...prev, [answer.id]: event.target.value }))}
                          placeholder="Agregar comentario de descargo."
                          className="min-h-24 border-border bg-background"
                        />
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" asChild>
                            <label>
                              <Paperclip className="mr-1 h-3.5 w-3.5" />
                              Evidencia
                              <Input
                                type="file"
                                className="hidden"
                                multiple
                                accept={auditedEvidenceAccept}
                                onChange={(event) => {
                                  const selectedFiles = Array.from(event.target.files ?? [])
                                  setFiles((prev) => ({ ...prev, [answer.id]: selectedFiles }))
                                  event.target.value = ""
                                }}
                              />
                            </label>
                          </Button>
                          <span className="min-w-0 truncate text-xs text-muted-foreground">
                            {answerFiles.length ? answerFiles.map((file) => file.name).join(", ") : "Sin archivo seleccionado"}
                          </span>
                          <Button size="sm" className="h-8 px-3 text-xs" onClick={() => handleSave(answer.id)} disabled={savingAnswerId === answer.id}>
                            <Save className="mr-1 h-3.5 w-3.5" />
                            Guardar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function AuditedDashboardInbox({
  controls,
  activeCycle,
  activeCycleYear,
}: {
  controls: AuditedControlContext[]
  activeCycle: Ciclo
  activeCycleYear: string | number
}) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="overflow-hidden border border-border/70 bg-card py-0 shadow-none hover:shadow-none">
          <CardContent className="flex min-h-[8.25rem] items-center px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Controles recibidos</p>
              <p className="mt-2 text-4xl font-semibold leading-none tracking-tight text-primary">{controls.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-border/70 bg-card py-0 shadow-none hover:shadow-none">
          <CardContent className="flex h-full min-h-[8.25rem] items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Ciclo de control</p>
              <p className="mt-1 text-xs text-muted-foreground">{activeCycleYear}</p>
            </div>
            <p className="shrink-0 text-4xl font-semibold leading-none tracking-tight text-primary">{String(activeCycle.bimestre).padStart(2, "0")}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card py-0 shadow-none">
        <CardHeader className="px-4 pb-2 pt-4">
          <CardTitle className="text-base font-semibold">Controles asignados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-4 pb-4 pt-0">
          {controls.map((control) => (
            <div key={control.id} className="grid gap-3 rounded-md border border-border/60 bg-background px-3 py-3 md:grid-cols-[minmax(0,1fr)_8rem_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{control.identificador || control.id}</p>
                  <Badge className={cn("h-5 px-2 text-[10px]", getEstadoBadgeColor(control.estado))}>{formatEstado(control.estado)}</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{control.unidadNombre} | {control.verticalNombre}</p>
              </div>
              <div className="md:text-right">
                <p className={cn("text-xl font-semibold leading-none", control.scoreControl !== undefined ? getScoreColor(control.scoreControl) : "text-muted-foreground")}>
                  {control.scoreControl !== undefined ? control.scoreControl : "-"}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Puntaje</p>
              </div>
              <Button size="sm" className="h-8 px-3 text-xs" asChild>
                <Link href={`/evaluaciones/${control.id}`}>
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  Verificar
                </Link>
              </Button>
            </div>
          ))}
          {controls.length === 0 && (
            <div className="rounded-md border border-dashed border-border/70 px-3 py-8 text-center text-sm text-muted-foreground">
              No tenes controles recibidos por replica.
            </div>
          )}
        </CardContent>
      </Card>
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
        { label: "Total", value: counts.total, className: "text-foreground", accent: "border-t-border" },
        { label: "Avances", value: counts.started, className: "text-primary", accent: "border-t-primary" },
        { label: "Pendientes", value: counts.pending, className: "text-destructive", accent: "border-t-destructive" },
      ]
    : [
        { label: "Total", value: counts.total, className: "text-foreground", accent: "border-t-border" },
        { label: "Terminadas", value: counts.completed, className: "text-success", accent: "border-t-success" },
        { label: "En curso", value: counts.inCourse, className: "text-primary", accent: "border-t-primary" },
        { label: "Pendientes", value: counts.pending, className: "text-destructive", accent: "border-t-destructive" },
      ]

  return (
    <Card className="overflow-hidden border border-border/70 bg-card py-0 shadow-none hover:shadow-none">
      <CardContent className="grid min-h-[8.5rem] gap-5 px-4 py-4 md:grid-cols-[minmax(0,1fr)_15rem] md:items-center">
        <div className="min-w-0 space-y-3">
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight">Dashboard Supervisor</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Progreso general del ciclo y estado operativo.</p>
          </div>
          <div className={cn("grid gap-2", kpiMode === "executive" ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4")}>
            {kpis.map((item) => (
              <div key={item.label} className={cn("rounded-md border border-t-2 border-border/60 bg-background px-3 py-2 shadow-none", item.accent)}>
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{item.label}</p>
                <p className={cn("mt-1.5 text-2xl font-semibold leading-none tracking-tight", item.className)}>{item.value}</p>
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

function SupervisorCycleMeta({
  cycleNumber,
  cycleYear,
  daysToClose,
}: {
  cycleNumber: string
  cycleYear: number
  daysToClose: number
}) {
  return (
    <Card className="h-full overflow-hidden border border-border/70 bg-card py-0 shadow-none hover:shadow-none">
      <CardContent className="grid h-full min-h-[8.5rem] grid-rows-2 divide-y divide-border/60 p-0">
        <div className="flex min-w-0 items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Ciclo activo</p>
            <p className="mt-1 text-xs leading-none text-muted-foreground">{cycleYear}</p>
          </div>
          <p className="shrink-0 text-3xl font-semibold leading-none tracking-tight text-primary">{cycleNumber}</p>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Cierre</p>
            <p className="mt-1 text-xs leading-none text-muted-foreground">dias restantes</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-semibold leading-none tracking-tight text-warning">{daysToClose}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SupervisorFocusPanel({
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
      title: "Lote con mas pendiente",
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
    <Card className="h-full gap-0 border-border/70 bg-card py-0 shadow-none hover:shadow-none">
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
                    item.tone === "danger" && "border-destructive/25 text-destructive",
                    item.tone === "warning" && "border-warning/30 text-warning",
                    item.tone === "success" && "border-success/25 text-success",
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{item.title}</p>
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

function SupervisorLoteProgress({ lotes }: { lotes: SupervisorLoteSummary[] }) {
  return (
    <Card className="border-border/70 bg-card py-0 shadow-none hover:shadow-none">
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
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Unidad</p>
                  <div className="mt-1 flex min-w-0 items-baseline gap-2">
                    <p className="truncate text-base font-semibold leading-tight">{lote.unidadNombre}</p>
                    <span className={cn("text-sm font-semibold tabular-nums", semaphore.text)}>{lote.progressPct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 max-w-[16rem] overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", semaphore.bg)} style={{ width: `${lote.progressPct}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center text-sm sm:min-w-[11rem]">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Total</p>
                    <p className="mt-1 font-semibold leading-none">{lote.counts.total}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Avances</p>
                    <p className="mt-1 font-semibold leading-none text-primary">{progressCount}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Pend.</p>
                    <p className="mt-1 font-semibold leading-none text-destructive">{lote.counts.pending}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-border/60 pt-2">
                <div className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_3rem] gap-2 px-2 pb-1 text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
                        <span className="text-xs font-semibold tabular-nums text-destructive">{pending}</span>
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

function SupervisorAnalystAssignments({ analysts }: { analysts: SupervisorAnalystSummary[] }) {
  return (
    <Card className="h-full gap-0 border-border/70 bg-card py-0 shadow-none hover:shadow-none">
      <CardHeader className="px-4 pb-2 pt-4 sm:px-5">
        <CardTitle className="text-base font-semibold">Carga por Analista</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 sm:px-5">
        <div className="min-w-0">
          <div className="grid grid-cols-[minmax(7rem,1fr)_repeat(4,minmax(3.4rem,4.75rem))] gap-x-2 border-b border-border/60 pb-2 text-center text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
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
                <p className="text-sm font-semibold tabular-nums text-destructive">{analyst.pending}</p>
                <div className="text-sm font-semibold tabular-nums">
                  <p className={cn(analyst.progressPct >= 80 ? "text-success" : analyst.progressPct >= 50 ? "text-warning" : "text-destructive")}>
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

function SupervisorInsightStrip({
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
        ? "Auditorias sin comenzar dentro de la ventana critica de cierre."
        : "La ventana critica se activa cuando falten 15 dias o menos.",
      icon: AlertTriangle,
      tone: bottleneckPending ? "danger" as const : "success" as const,
    },
  ]

  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {insights.map((insight) => {
        const Icon = insight.icon

        return (
          <Card key={insight.title} className="border-border/70 bg-card py-0 shadow-none hover:shadow-none">
            <CardContent className="flex gap-3 px-4 py-3">
              <span className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border",
                insight.tone === "danger" ? "border-destructive/25 bg-destructive/5 text-destructive" : "border-success/25 bg-success/5 text-success",
              )}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{insight.title}</p>
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

function CeoScoreCard({
  score,
  delta,
}: {
  score: number | null
  delta: number | null
}) {
  const trendUp = (delta ?? 0) >= 0
  const TrendIcon = trendUp ? ArrowUp : ArrowDown
  const tone = getExecutiveScoreTone(score)

  return (
    <Card className={cn("group h-full overflow-hidden border-border/70 bg-card py-0 shadow-none ring-1 ring-border/35 transition-colors hover:border-primary/25 hover:bg-muted/10 hover:shadow-none", tone.border)}>
      <CardContent className="relative grid min-h-[8.5rem] grid-rows-[auto_1fr_auto] gap-3 px-5 py-4">
        <span className={cn("absolute inset-x-0 top-0 h-0.5", tone.bg)} />
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="whitespace-nowrap text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-muted-foreground">Score general del grupo</p>
        </div>
        <div className="flex min-w-0 items-end justify-between gap-3">
          <div className="flex min-w-0 items-end gap-3">
            <p className={cn("text-[2.65rem] font-semibold leading-none tracking-tight", tone.text)}>
              {score !== null ? score : "-"}{score !== null && <span className="text-2xl">%</span>}
            </p>
            <div className={cn(
              "mb-1 inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2.5 text-sm font-semibold",
              delta === null ? "bg-muted/20 text-muted-foreground" : trendUp ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
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

function normalizeAuditedValue(value: string | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function answerBelongsToAuditedUser(answer: { personasAuditadas?: string[] }, user: { name?: string; email?: string } | undefined) {
  if (!user) return false
  const userKeys = [user.name, user.email].map(normalizeAuditedValue).filter(Boolean)
  const auditedKeys = (answer.personasAuditadas ?? []).map(normalizeAuditedValue).filter(Boolean)

  return auditedKeys.some((auditedKey) =>
    userKeys.some((userKey) => auditedKey === userKey || auditedKey.includes(userKey) || userKey.includes(auditedKey)),
  )
}

function CeoMetricCard({
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
    <Card className="group h-full overflow-hidden border-border/70 bg-card py-0 shadow-none ring-1 ring-border/35 transition-colors hover:border-primary/25 hover:bg-muted/10 hover:shadow-none">
      <CardContent className="relative grid min-h-[8.5rem] grid-rows-[auto_1fr_auto] gap-3 px-5 py-4">
        <span className={cn("absolute inset-x-0 top-0 h-0.5", accentClassName)} />
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="whitespace-nowrap text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-muted-foreground">{title}</p>
        </div>
        <div className="flex items-end">
          <p className="text-[2.65rem] font-semibold leading-none tracking-tight text-foreground">{value}</p>
        </div>
        {detail && <p className="line-clamp-2 border-t border-border/50 pt-2 text-xs leading-snug text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  )
}

function CeoGauge({ score }: { score: number | null }) {
  const tone = getExecutiveScoreTone(score)
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
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Score global</p>
      </div>
    </div>
  )
}

function CeoGroupHealth({
  score,
  lotes,
}: {
  score: number | null
  lotes: SupervisorLoteSummary[]
}) {
  const scoredLotes = lotes.filter((lote): lote is SupervisorLoteSummary & { unitScore: number } => lote.unitScore !== null)
  const groups = [
    { label: "Critico < 60%", count: scoredLotes.filter((lote) => lote.unitScore < EXECUTIVE_SCORE.critical).length, tone: getExecutiveScoreTone(0) },
    { label: "Aceptable 60-84%", count: scoredLotes.filter((lote) => lote.unitScore >= EXECUTIVE_SCORE.critical && lote.unitScore < EXECUTIVE_SCORE.optimal).length, tone: getExecutiveScoreTone(70) },
    { label: "Optimo >= 85%", count: scoredLotes.filter((lote) => lote.unitScore >= EXECUTIVE_SCORE.optimal).length, tone: getExecutiveScoreTone(90) },
  ]
  const gap = score !== null ? Math.max(0, 100 - score) : null

  return (
    <Card className="h-full border-border/70 bg-card py-0 shadow-none hover:shadow-none">
      <CardHeader className="px-5 pb-1 pt-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="h-2 w-2 rounded-sm bg-success" />
          Salud del grupo
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 px-5 pb-4 pt-0 md:grid-cols-[minmax(18rem,1.2fr)_minmax(15.5rem,0.8fr)] md:items-center">
        <div className="flex justify-center md:justify-start">
          <CeoGauge score={score} />
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
            <span className="text-right font-semibold tabular-nums text-warning">{gap !== null ? `${gap} pts` : "-"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CeoHistoricalDetailDialog({
  open,
  onOpenChange,
  history,
  selectedUnitId,
  selectedVerticalId,
  unitOptions,
  unitLocked = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  history: CeoCycleSummary[]
  selectedUnitId: string
  selectedVerticalId: string
  unitOptions: { id: string; name: string }[]
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
          <DialogTitle>Detalle comparativo de evolucion historica</DialogTitle>
          <DialogDescription>
            Comparacion de los ultimos dos ciclos disponibles para la unidad seleccionada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-md border border-border/60 bg-muted/15 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-background">
                {latestLote?.unidadLogo ? (
                  <img src={latestLote.unidadLogo} alt={latestLote.unidadNombre} className="h-full w-full object-contain" />
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
                ? "Penultimo ciclo evaluado"
                : "Ultimo ciclo evaluado"

              return (
                <div key={cycle.id} className="rounded-md border border-border/60 bg-background/35 p-4">
                  <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{cyclePositionLabel}</p>
                      <p className="mt-1 text-sm font-semibold">{cycle.label}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{lote?.modeloNombre ?? "Sin evaluacion en este ciclo"}</p>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0", getExecutiveScoreTone(lote?.unitScore).text)}>
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
                          <div className="shrink-0 text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Peso {vertical.weight}%</p>
                            <p className="text-sm font-semibold tabular-nums">{formatScore(vertical.achieved)}</p>
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
                                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Aporte</p>
                                <p className="font-semibold tabular-nums">{formatScore(control.achieved)}</p>
                              </div>
                              <Badge variant="outline" className="w-fit justify-self-start border-border bg-muted/20 text-xs sm:justify-self-end">
                                Control
                              </Badge>
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

function CeoHistoricalChart({
  history,
  selectedUnitId,
  onSelectedUnitIdChange,
  selectedVerticalId,
  onSelectedVerticalIdChange,
  unitOptions,
  verticalOptions,
  unitLocked = false,
}: {
  history: CeoCycleSummary[]
  selectedUnitId: string
  onSelectedUnitIdChange: (value: string) => void
  selectedVerticalId: string
  onSelectedVerticalIdChange: (value: string) => void
  unitOptions: { id: string; name: string }[]
  verticalOptions: { id: string; name: string }[]
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
      <Card className="h-full border-border/70 bg-card py-0 shadow-none hover:shadow-none">
        <CardHeader className="px-5 pb-4 pt-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <span className="h-2 w-2 rounded-sm bg-success" />
                Evolucion historica
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
                    <text x={6} y={y + 4} className="fill-muted-foreground text-[9px]">{tick}</text>
                  </g>
                )
              })}
              <line x1={padding} x2={width - padding} y1={padding} y2={padding} stroke="currentColor" strokeDasharray="4 4" className="text-muted-foreground" />
              {path && <path d={path} fill="none" stroke="var(--success)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />}
              {coords.map((point) => point.y !== null && point.score !== null ? (
                <g key={point.label}>
                  <circle cx={point.x} cy={point.y} r="4" fill="var(--success)" />
                  <text x={point.x} y={Math.max(12, point.y - 9)} textAnchor="middle" className="fill-success text-[10px] font-semibold">{point.score}%</text>
                  <text x={point.x} y={height - 7} textAnchor="middle" className="fill-muted-foreground text-[10px]">{point.label}</text>
                </g>
              ) : (
                <g key={point.label}>
                  <text x={point.x} y={height - 7} textAnchor="middle" className="fill-muted-foreground text-[10px]">{point.label}</text>
                  <text x={point.x} y={height / 2} textAnchor="middle" className="fill-muted-foreground text-[10px]">S/D</text>
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
        unitLocked={unitLocked}
      />
    </>
  )
}

function CeoRanking({ lotes }: { lotes: SupervisorLoteSummary[] }) {
  const ranking = [...lotes].sort((a, b) => (b.unitScore ?? -1) - (a.unitScore ?? -1))

  return (
    <Card className="h-full border-border/70 bg-card py-0 shadow-none hover:shadow-none">
      <CardHeader className="px-5 pb-1 pt-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="h-2 w-2 rounded-sm bg-success" />
          Ranking - score por UN
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-5 pb-4 pt-0">
        {ranking.map((lote, index) => {
          const tone = getExecutiveScoreTone(lote.unitScore)
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

function CeoSemaphoreMatrix({ lotes }: { lotes: SupervisorLoteSummary[] }) {
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
    <Card className="h-full border-border/70 bg-card py-0 shadow-none hover:shadow-none">
      <CardHeader className="px-5 pb-2 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="h-2 w-2 rounded-sm bg-success" />
          Semaforo - UN x vertical
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        <div className="min-w-0">
          <div className="grid gap-2 pb-2 text-center text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-foreground sm:text-[10px]" style={{ gridTemplateColumns }}>
            <span className="text-left">Unidad</span>
            {columns.map((column) => (
              <span key={column.id} className="min-w-0">
                <span className="block truncate">{column.label}</span>
                {column.weight !== null && <span className="block text-[8px] font-medium sm:text-[9px]">{column.weight}%</span>}
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
                    const tone = getExecutiveScoreTone(toneScore)
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
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-destructive" /> &lt; 60%</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-warning" /> 60-84%</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-success" /> &gt;= 85%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CeoParameterDistribution({ distribution }: { distribution: ParameterDistribution }) {
  const pct = (value: number) => distribution.total ? Math.round((value / distribution.total) * 100) : 0
  const items = [
    { label: "Cumple (verde)", value: distribution.cumple, pct: pct(distribution.cumple), tone: getExecutiveScoreTone(90) },
    { label: "Parcial (amarillo)", value: distribution.intermedio, pct: pct(distribution.intermedio), tone: getExecutiveScoreTone(70) },
    { label: "No cumple (rojo)", value: distribution.noCumple, pct: pct(distribution.noCumple), tone: getExecutiveScoreTone(0) },
  ]
  const redPct = pct(distribution.noCumple)

  return (
    <Card className="border-border/70 bg-card py-0 shadow-none hover:shadow-none">
      <CardHeader className="px-5 pb-2 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="h-2 w-2 rounded-sm bg-success" />
          Distribucion de parametros
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 px-5 pb-5 pt-0 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
        <div className="relative mx-auto h-32 w-32 rounded-full" style={{ background: `conic-gradient(var(--success) 0 ${items[0].pct}%, var(--warning) ${items[0].pct}% ${items[0].pct + items[1].pct}%, var(--destructive) ${items[0].pct + items[1].pct}% 100%)` }}>
          <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-card">
            <span className="text-3xl font-semibold leading-none">{distribution.total}</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Parametros</span>
          </div>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <span className={cn("h-3 w-3 rounded-sm", item.tone.bg)} />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums">{item.pct}%</span>
            </div>
          ))}
          <div className={cn("rounded-md border px-4 py-3 text-sm", redPct ? "border-destructive/30 bg-destructive/8" : "border-success/25 bg-success/8")}>
            <span className={cn("font-semibold", redPct ? "text-destructive" : "text-success")}>
              {redPct}% de parametros estan en rojo.
            </span>{" "}
            <span className="text-muted-foreground">
              El foco del proximo ciclo debe convertir amarillos en verdes y reducir no cumple.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardContent() {
  const [activeView, setActiveView] = useState<DashboardView>("auditado")
  const [ceoUnitFilter, setCeoUnitFilter] = useState("all")
  const [ceoChartUnitFilter, setCeoChartUnitFilter] = useState("all")
  const [ceoChartVerticalFilter, setCeoChartVerticalFilter] = useState("all")
  const { appUser } = useAuth()
  const { data: appData } = useAppData()
  const isAuditor = appUser?.role === "auditor"
  const isAuditado = appUser?.role === "auditado"
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
    if (isAuditado) setActiveView("auditado")
    if (isSupervisor) setActiveView("supervisor")
  }, [isAuditado, isAuditor, isSupervisor])

  const metrics = useMemo(() => {
    const activeCycle = getActiveCycle(ciclos)
    const activeLotes = lotes.filter((lote) => lote.ciclo === activeCycle.bimestre && lote[YEAR_KEY] === activeCycle[YEAR_KEY] && isCountableLote(lote))
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
          etiqueta: control.etiqueta,
          proceso: control.proceso,
          subproceso: control.subproceso,
          producto: control.producto,
          productosVinculados: control.productosVinculados,
          correspondeProceso: control.correspondeProceso,
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
    const currentUser = users.find((user) => user.id === appUser?.id)
    const auditedControlIds = new Set(
      respuestas
        .filter((answer) => isAuditado ? answerBelongsToAuditedUser(answer, currentUser) : (answer.personasAuditadas?.length ?? 0) > 0)
        .map((answer) => answer.controlId),
    )
    const auditedControls: AuditedControlContext[] = allControls
      .filter((control) => auditedControlIds.has(control.id))
      .filter((control) => control.estado === "en_replica" || control.estado === "terminado" || control.estado === "terminada")
      .map((control) => ({
        ...control,
        respuestas: respuestas.filter((answer) =>
          answer.controlId === control.id &&
          (isAuditado ? answerBelongsToAuditedUser(answer, currentUser) : (answer.personasAuditadas?.length ?? 0) > 0)
        ),
      }))
    const analystAuditorId = isAuditor ? appUser?.id : users.find((user) => user.role === "auditor")?.id
    const analystControls = allControls.filter((control) => control.auditorId === analystAuditorId)
    const analystAssignedLotes = activeLotes.filter((lote) => analystAuditorId ? lote.auditores.includes(analystAuditorId) : false)
    const analystAssignedLoteIds = analystAssignedLotes.map((lote) => lote.id)
    const coveragePct = unidades.length
      ? Math.round((new Set(activeLotes.map((lote) => lote.unidadNegocioId)).size / unidades.length) * 100)
      : 0
    const answeredControlIds = new Set(respuestas.map((answer) => answer.controlId))
    const globalCounts = getCounts(allControls, answeredControlIds)
    const analystCounts = getCounts(analystControls, answeredControlIds)
    const assignedLotControls = allControls.filter((control) => analystAssignedLoteIds.includes(control.loteId))
    const assignedLotCounts = getCounts(assignedLotControls, answeredControlIds)
    const analystOpenControls = analystControls.filter((control) => control.estado !== "terminado" && control.estado !== "terminada")
    const supervisorAnalystSummaries: SupervisorAnalystSummary[] = users
      .filter((user) => user.role === "auditor")
      .map((auditor) => {
        const assignedControls = allControls.filter((control) => control.auditorId === auditor.id)
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
    const supervisorLoteSummaries: SupervisorLoteSummary[] = activeLotes.map((lote) => {
      const unidad = unidades.find((unit) => unit.id === lote.unidadNegocioId)
      const modelo = modelos.find((model) => model.id === lote.modeloControlId)
      const loteControls = allControls.filter((control) => control.loteId === lote.id)
      const counts = getCounts(loteControls, answeredControlIds)
      const verticalScores = modelo?.verticales.map((vertical) => {
        const verticalControls = loteControls.filter((control) => control.verticalId === vertical.id)
        const verticalControlIds = new Set(verticalControls.map((control) => control.id))
        const answeredVerticalControlIds = new Set(
          respuestas
            .filter((answer) => verticalControlIds.has(answer.controlId))
            .map((answer) => answer.controlId),
        )
        const completed = verticalControls.filter((control) => control.estado === "terminado" || control.estado === "terminada").length
        const inCourse = verticalControls.filter((control) => {
          if (control.estado === "terminado" || control.estado === "terminada") return false
          return control.estado === "en_curso" || control.estado === "en_replica" || answeredVerticalControlIds.has(control.id)
        }).length
        const advance = inCourse + completed
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
          advance,
          pending: Math.max(0, verticalControls.length - advance),
          completed,
          progressPct: verticalControls.length ? Math.round((advance / verticalControls.length) * 100) : 0,
          performancePct: averageScore,
          achieved: averageScore !== null ? Number(((averageScore * vertical.peso) / 100).toFixed(1)) : null,
          parameterStats,
          controls: verticalControls.map((control) => ({
            id: control.id,
            identificador: control.identificador,
            estado: control.estado,
            scoreControl: control.scoreControl,
            etiqueta: control.etiqueta,
            proceso: control.proceso,
            subproceso: control.subproceso,
            producto: control.producto,
            productosVinculados: control.productosVinculados,
            correspondeProceso: control.correspondeProceso,
          })),
        }
      }) ?? []
      const hasUnitScore = verticalScores.some((vertical) => vertical.achieved !== null)
      const unitScore = hasUnitScore
        ? Number(
            verticalScores
              .reduce((sum, vertical) => sum + (vertical.achieved ?? 0), 0)
              .toFixed(1),
          )
        : null
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
        unidadNegocioId: lote.unidadNegocioId,
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
    const buildCycleSummary = (cycle: Ciclo): CeoCycleSummary => {
      const cycleLotes = lotes.filter((lote) => lote.ciclo === cycle.bimestre && lote[YEAR_KEY] === cycle[YEAR_KEY] && isCountableLote(lote))
      const cycleLoteIds = new Set(cycleLotes.map((lote) => lote.id))
      const cycleVerticalMap = new Map<string, { id: string; name: string; weight: number }>()

      cycleLotes.forEach((lote) => {
        const modelo = modelos.find((model) => model.id === lote.modeloControlId)
        modelo?.verticales.forEach((vertical) => {
          cycleVerticalMap.set(vertical.id, { id: vertical.id, name: vertical.nombre, weight: vertical.peso })
        })
      })

      const cycleControls: ControlContext[] = loteVerticales
        .filter((loteVertical) => cycleLoteIds.has(loteVertical.loteId))
        .flatMap((loteVertical) => {
          const lote = cycleLotes.find((item) => item.id === loteVertical.loteId)
          const unidad = unidades.find((item) => item.id === lote?.unidadNegocioId)
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
      const cycleFallbackControls: ControlContext[] = auditorias
        .filter((auditoria) => cycleLoteIds.has(auditoria.loteId))
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
      const cycleAllControls = cycleControls.length ? cycleControls : cycleFallbackControls
      const cycleSummaries: SupervisorLoteSummary[] = cycleLotes.map((lote) => {
        const unidad = unidades.find((unit) => unit.id === lote.unidadNegocioId)
        const modelo = modelos.find((model) => model.id === lote.modeloControlId)
        const loteControls = cycleAllControls.filter((control) => control.loteId === lote.id)
        const counts = getCounts(loteControls, answeredControlIds)
        const verticalScores = modelo?.verticales.map((vertical) => {
          const verticalControls = loteControls.filter((control) => control.verticalId === vertical.id)
          const verticalControlIds = new Set(verticalControls.map((control) => control.id))
          const answeredVerticalControlIds = new Set(
            respuestas
              .filter((answer) => verticalControlIds.has(answer.controlId))
              .map((answer) => answer.controlId),
          )
          const completed = verticalControls.filter((control) => control.estado === "terminado" || control.estado === "terminada").length
          const inCourse = verticalControls.filter((control) => {
            if (control.estado === "terminado" || control.estado === "terminada") return false
            return control.estado === "en_curso" || control.estado === "en_replica" || answeredVerticalControlIds.has(control.id)
          }).length
          const advance = inCourse + completed
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
            advance,
            pending: Math.max(0, verticalControls.length - advance),
            completed,
            progressPct: verticalControls.length ? Math.round((advance / verticalControls.length) * 100) : 0,
            performancePct: averageScore,
            achieved: averageScore !== null ? Number(((averageScore * vertical.peso) / 100).toFixed(1)) : null,
            parameterStats,
            controls: verticalControls.map((control) => ({
              id: control.id,
              identificador: control.identificador,
              estado: control.estado,
              scoreControl: control.scoreControl,
              etiqueta: control.etiqueta,
              proceso: control.proceso,
              subproceso: control.subproceso,
              producto: control.producto,
              productosVinculados: control.productosVinculados,
              correspondeProceso: control.correspondeProceso,
            })),
          }
        }) ?? []
        const hasUnitScore = verticalScores.some((vertical) => vertical.achieved !== null)
        const unitScore = hasUnitScore
          ? Number(
              verticalScores
                .reduce((sum, vertical) => sum + (vertical.achieved ?? 0), 0)
                .toFixed(1),
            )
          : null
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
          unidadNegocioId: lote.unidadNegocioId,
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
      activeCycleYear: activeCycle.fechaInicio.slice(0, 4),
      progressLabel: `${globalCounts.started}/${globalCounts.total || 0}`,
      cycleSummaries: lastCycleSummaries,
    }
  }, [appUser?.id, auditorias, ciclos, isAuditado, isAuditor, loteVerticales, lotes, modelos, respuestas, unidades, users])

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
      auditado: {
        cards: [
          {
            title: "Controles recibidos",
            value: metrics.auditedControls.length,
            tone: "primary",
          },
          {
            title: "En replica",
            value: metrics.auditedControls.filter((control) => control.estado === "en_replica").length,
            tone: "warning",
          },
          {
            title: "Con descargo",
            value: metrics.auditedControls.filter((control) => control.respuestas.some((answer) => answer.descargosAuditado?.length)).length,
            tone: "success",
          },
          {
            title: "Pendientes",
            value: metrics.auditedControls.filter((control) => !control.respuestas.some((answer) => answer.descargosAuditado?.length)).length,
            tone: "neutral",
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

  const dashboardView: DashboardView = isAuditor ? "analista" : isAuditado ? "auditado" : isSupervisor ? "supervisor" : activeView
  const activeDashboard = roleDashboards[dashboardView]

  if (dashboardView === "auditado") {
    return (
      <div className="space-y-4">
        {!isAuditado && (
          <Tabs value={dashboardView} onValueChange={(value) => setActiveView(value as DashboardView)} className="w-full">
            <TabsList className="responsive-scroll flex w-full justify-start gap-1 overflow-x-auto bg-secondary sm:grid sm:w-fit sm:grid-cols-4 sm:overflow-visible">
              <TabsTrigger value="auditado" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Auditado
              </TabsTrigger>
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
        <AuditedDashboardInbox
          controls={metrics.auditedControls}
          activeCycle={metrics.activeCycle}
          activeCycleYear={metrics.activeCycleYear}
        />
      </div>
    )
  }

  if (dashboardView === "analista") {
    return (
      <div className="space-y-4">
        {!isAuditor && !isSupervisor && (
          <Tabs value={dashboardView} onValueChange={(value) => setActiveView(value as DashboardView)} className="w-full">
            <TabsList className="responsive-scroll flex w-full justify-start gap-1 overflow-x-auto bg-secondary sm:grid sm:w-fit sm:grid-cols-4 sm:overflow-visible">
              <TabsTrigger value="auditado" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Auditado
              </TabsTrigger>
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

        <section className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <AnalystProgressPanel counts={metrics.assignedLotCounts} lotes={metrics.supervisorLoteSummaries.filter((lote) =>
            metrics.analystAssignedLoteIds.includes(lote.id)
          )} />

          <Card className="overflow-hidden border border-border/70 bg-card py-0 shadow-none hover:shadow-none">
            <CardContent className="grid h-full min-h-[8.25rem] grid-rows-2 divide-y divide-border/60 p-0">
              <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Ciclo activo</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metrics.activeCycleYear}</p>
                </div>
                <p className="shrink-0 text-3xl font-semibold leading-none tracking-tight text-primary">{String(metrics.activeCycle.bimestre).padStart(2, "0")}</p>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Cierre</p>
                  <p className="mt-1 text-xs text-muted-foreground">dias restantes</p>
                </div>
                <p className="shrink-0 text-3xl font-semibold leading-none tracking-tight text-warning">{metrics.daysToCycleClose}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {activeDashboard.cards.map((stat) => (
            <KpiCard key={stat.title} stat={stat} />
          ))}
        </section>

        <Card className="border-border/70 bg-card py-0 shadow-none hover:shadow-none">
          <CardHeader className="px-4 pb-1 pt-3">
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold">Seguimiento de controles de ser</CardTitle>
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
        {!isAuditor && !isSupervisor && (
          <Tabs value={dashboardView} onValueChange={(value) => setActiveView(value as DashboardView)} className="w-full">
            <TabsList className="responsive-scroll flex w-full justify-start gap-1 overflow-x-auto bg-secondary sm:grid sm:w-fit sm:grid-cols-4 sm:overflow-visible">
              <TabsTrigger value="auditado" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Auditado
              </TabsTrigger>
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

  const ceoUnitOptions = Array.from(
    new Map(
      metrics.supervisorLoteSummaries
        .filter((lote) => lote.unidadNegocioId)
        .map((lote) => [lote.unidadNegocioId!, { id: lote.unidadNegocioId!, name: lote.unidadNombre }]),
    ).values(),
  )
  const ceoFilteredLotes = ceoUnitFilter === "all"
    ? metrics.supervisorLoteSummaries
    : metrics.supervisorLoteSummaries.filter((lote) => lote.unidadNegocioId === ceoUnitFilter)
  const ceoFilteredLoteIds = new Set(ceoFilteredLotes.map((lote) => lote.id))
  const ceoFilteredControls = metrics.allControls.filter((control) => ceoFilteredLoteIds.has(control.loteId))
  const ceoCurrentScore = averageUnitScore(ceoFilteredLotes)
  const previousCycle = metrics.cycleSummaries.length > 1 ? metrics.cycleSummaries[metrics.cycleSummaries.length - 2] : null
  const previousLotes = previousCycle
    ? ceoUnitFilter === "all"
      ? previousCycle.lotes
      : previousCycle.lotes.filter((lote) => lote.unidadNegocioId === ceoUnitFilter)
    : []
  const ceoPreviousScore = previousCycle ? averageUnitScore(previousLotes) : ceoCurrentScore
  const ceoDelta = ceoCurrentScore !== null && ceoPreviousScore !== null ? ceoCurrentScore - ceoPreviousScore : null
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
  const parameterDistribution = ceoFilteredLotes.reduce<ParameterDistribution>((acc, lote) => {
    lote.verticalScores.forEach((vertical) => {
      vertical.parameterStats.forEach((parametro) => {
        acc.cumple += parametro.cumple
        acc.intermedio += parametro.intermedio
        acc.noCumple += parametro.noCumple
      })
    })
    return acc
  }, { total: 0, cumple: 0, intermedio: 0, noCumple: 0 })
  parameterDistribution.total = parameterDistribution.cumple + parameterDistribution.intermedio + parameterDistribution.noCumple
  const effectiveChartUnitFilter = ceoUnitFilter !== "all" ? ceoUnitFilter : ceoChartUnitFilter

  return (
    <div className="space-y-4">
      {!isAuditor && !isSupervisor && (
        <Tabs value={dashboardView} onValueChange={(value) => setActiveView(value as DashboardView)} className="w-full">
          <TabsList className="responsive-scroll flex w-full justify-start gap-1 overflow-x-auto bg-secondary sm:grid sm:w-fit sm:grid-cols-4 sm:overflow-visible">
            <TabsTrigger value="auditado" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Auditado
            </TabsTrigger>
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

      <Card className="border-border/70 bg-card py-0 shadow-none hover:shadow-none">
        <CardContent className="flex flex-col gap-2 px-3 py-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Filtro ejecutivo</p>
            </div>
          </div>
          <Select value={ceoUnitFilter} onValueChange={(value) => {
            setCeoUnitFilter(value)
            setCeoChartUnitFilter("all")
          }}>
            <SelectTrigger className="h-9 w-full border-border bg-secondary/70 md:w-[18rem]">
              <SelectValue placeholder="Unidad de negocio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las unidades</SelectItem>
              {ceoUnitOptions.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CeoScoreCard score={ceoCurrentScore} delta={ceoDelta} />
        <CeoMetricCard title="Unidades de negocio evaluadas" value={unitCount} detail={ceoFilteredLotes.map((lote) => lote.unidadNombre).join(", ") || "Sin unidades evaluadas"} />
        <CeoMetricCard title="Productos evaluados" value={productCount} detail="Controles clasificados como producto" />
        <CeoMetricCard title="Procesos evaluados" value={processCount} detail="Procesos y subprocesos auditados" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
        <CeoGroupHealth score={ceoCurrentScore} lotes={ceoFilteredLotes} />
        <CeoRanking lotes={ceoFilteredLotes} />
      </section>

      <CeoSemaphoreMatrix lotes={ceoFilteredLotes} />

      <CeoHistoricalChart
        history={metrics.cycleSummaries}
        selectedUnitId={effectiveChartUnitFilter}
        onSelectedUnitIdChange={setCeoChartUnitFilter}
        selectedVerticalId={ceoChartVerticalFilter}
        onSelectedVerticalIdChange={setCeoChartVerticalFilter}
        unitOptions={ceoUnitFilter === "all" ? ceoUnitOptions : ceoUnitOptions.filter((unit) => unit.id === ceoUnitFilter)}
        verticalOptions={ceoVerticalOptions}
        unitLocked={ceoUnitFilter !== "all"}
      />

      <CeoParameterDistribution distribution={parameterDistribution} />
    </div>
  )
}

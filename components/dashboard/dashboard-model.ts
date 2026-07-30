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

export type DashboardView = "analista" | "supervisor" | "ceo"

const YEAR_KEY = "a\u00f1o"

export type ControlContext = {
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


export type StatCard = {
  title: string
  value: string | number
  tone: "primary" | "success" | "warning" | "danger" | "neutral"
}

export type RoleDashboard = {
  cards: StatCard[]
}

export type SupervisorVerticalScore = {
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

export type SupervisorLoteSummary = {
  id: string
  unidadNegocioId?: string
  unidadNombre: string
  unidadEcosistema: string
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

export type SupervisorAnalystSummary = {
  id: string
  name: string
  assigned: number
  advance: number
  inCourse: number
  completed: number
  pending: number
  progressPct: number
}

export type CeoCycleSummary = {
  id: string
  label: string
  lotes: SupervisorLoteSummary[]
}

export type LotSummaryIndexes = {
  unitsById: Map<string, UnidadNegocio>
  modelsById: Map<string, ModeloControl>
  controlsByLotId: Map<string, ControlContext[]>
  answersByControlId: Map<string, Respuesta[]>
  answeredControlIds: Set<string>
}

export function appendToIndex<T>(index: Map<string, T[]>, key: string, value: T) {
  const values = index.get(key)
  if (values) values.push(value)
  else index.set(key, [value])
}

export function buildLotSummary(lote: Lote, indexes: LotSummaryIndexes): SupervisorLoteSummary {
  const unidad = indexes.unitsById.get(lote.unidadNegocioId)
  const modelo = indexes.modelsById.get(lote.modeloControlId)
  const loteControls = indexes.controlsByLotId.get(lote.id) ?? []
  const controlsByVerticalId = new Map<string, ControlContext[]>()
  loteControls.forEach((control) => appendToIndex(controlsByVerticalId, control.verticalId, control))

  const verticalScores = modelo?.verticales.map((vertical): SupervisorVerticalScore => {
    const verticalControls = controlsByVerticalId.get(vertical.id) ?? []
    const answersByParameterId = new Map<string, Respuesta[]>()

    verticalControls.forEach((control) => {
      ;(indexes.answersByControlId.get(control.id) ?? []).forEach((answer) => {
        appendToIndex(answersByParameterId, answer.parametroId, answer)
      })
    })

    const completed = verticalControls.filter((control) => control.estado === "terminado" || control.estado === "terminada").length
    const inCourse = verticalControls.filter((control) =>
      control.estado !== "terminado" &&
      control.estado !== "terminada" &&
      (control.estado === "en_curso" || control.estado === "en_replica" || indexes.answeredControlIds.has(control.id))
    ).length
    const advance = completed + inCourse
    const scored = verticalControls.filter((control) => control.scoreControl !== undefined)
    const averageScore = scored.length
      ? Math.round(scored.reduce((sum, control) => sum + (control.scoreControl ?? 0), 0) / scored.length)
      : null

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
      parameterStats: vertical.parametros.map((parametro) => {
        const parameterAnswers = answersByParameterId.get(parametro.id) ?? []
        const noCumple = parameterAnswers.filter((answer) => answer.valor === "no_cumple").length
        return {
          id: parametro.id,
          name: parametro.nombre,
          total: parameterAnswers.length,
          cumple: parameterAnswers.filter((answer) => answer.valor === "cumple").length,
          intermedio: parameterAnswers.filter((answer) => answer.valor === "intermedio").length,
          noCumple,
          na: parameterAnswers.filter((answer) => answer.valor === "na").length,
          noResponse: Math.max(0, verticalControls.length - parameterAnswers.length),
          noCumplePct: verticalControls.length ? Math.round((noCumple / verticalControls.length) * 100) : 0,
        }
      }),
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

  const counts = getCounts(loteControls, indexes.answeredControlIds)
  const hasUnitScore = verticalScores.some((vertical) => vertical.achieved !== null)
  const unitScore = hasUnitScore
    ? Number(verticalScores.reduce((sum, vertical) => sum + (vertical.achieved ?? 0), 0).toFixed(1))
    : null
  const nonCompliance = verticalScores
    .flatMap((vertical) => vertical.parameterStats
      .filter((parameter) => parameter.noCumple > 0)
      .map((parameter) => ({
        id: `${lote.id}-${vertical.id}-${parameter.id}`,
        verticalName: vertical.name,
        parametro: parameter.name,
        count: parameter.noCumple,
        total: parameter.total,
      })))
    .sort((first, second) => second.count - first.count || second.total - first.total)
    .slice(0, 3)

  return {
    id: lote.id,
    unidadNegocioId: lote.unidadNegocioId,
    unidadNombre: unidad?.nombre || "N/A",
    unidadEcosistema: unidad?.ecosistema || "Sin ecosistema",
    unidadLogo: unidad?.logo,
    modeloNombre: modelo?.nombre || "N/A",
    estado: lote.estado,
    counts,
    progressPct: counts.progressPct,
    unitScore,
    verticalScores,
    nonCompliance,
  }
}

export type ParameterDistribution = {
  total: number
  cumple: number
  intermedio: number
  noCumple: number
}

export type ParameterDistributionDetail = {
  key: string
  name: string
  verticalName: string
  unitName: string
  total: number
  cumple: number
  intermedio: number
  noCumple: number
}

export function buildParameterDistribution(lotes: SupervisorLoteSummary[]) {
  const distribution: ParameterDistribution = { total: 0, cumple: 0, intermedio: 0, noCumple: 0 }
  const details: ParameterDistributionDetail[] = []

  lotes.forEach((lote) => {
    lote.verticalScores.forEach((vertical) => {
      vertical.parameterStats.forEach((parameter) => {
        const total = parameter.cumple + parameter.intermedio + parameter.noCumple
        distribution.cumple += parameter.cumple
        distribution.intermedio += parameter.intermedio
        distribution.noCumple += parameter.noCumple
        if (total > 0) {
          details.push({
            key: `${lote.id}-${vertical.id}-${parameter.id}`,
            name: parameter.name,
            verticalName: vertical.name,
            unitName: lote.unidadNombre,
            total,
            cumple: parameter.cumple,
            intermedio: parameter.intermedio,
            noCumple: parameter.noCumple,
          })
        }
      })
    })
  })

  distribution.total = distribution.cumple + distribution.intermedio + distribution.noCumple
  return { distribution, details }
}

export type CeoSemaphoreColumn = {
  id: string
  label: string
  weight: number | null
  getScore: (lote: SupervisorLoteSummary) => number | null
  getToneScore?: (lote: SupervisorLoteSummary) => number | null
  hasVertical: (lote: SupervisorLoteSummary) => boolean
}

export type CeoComparedCycle = {
  id: string
  label: string
  lote?: SupervisorLoteSummary
}

export type CeoCycleVerticalDetail = {
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

const toneValueStyles: Record<StatCard["tone"], string> = {
  primary: "text-primary",
  success: "text-status-success-text",
  warning: "text-status-warning-text",
  danger: "text-status-danger-text",
  neutral: "text-foreground",
}

// Selección del ciclo y cálculo de contadores compartidos entre paneles.
// Normalización de categorías y nombres para agrupaciones ejecutivas.
export function getControlCategory(control: ControlContext) {
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

export function getSummaryControlCategory(control: SupervisorVerticalScore["controls"][number], verticalName: string) {
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

export function getControlProductLabels(control: SupervisorVerticalScore["controls"][number]) {
  const products = [control.producto, ...(control.productosVinculados ?? [])]
    .map((product) => product?.trim())
    .filter((product): product is string => Boolean(product))

  return products.length ? products : [control.identificador ?? "Producto sin nombre"]
}

export function getControlProcessLabel(control: SupervisorVerticalScore["controls"][number]) {
  return control.proceso?.trim() || control.subproceso?.trim() || control.identificador || "Proceso sin nombre"
}

export function getUniqueNonEmpty(values: (string | undefined)[]) {
  return new Set(values.map((value) => value?.trim()).filter(Boolean)).size
}

export function normalizeComparableName(value: string) {
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

export function getVerticalGroupKey(name: string) {
  return normalizeComparableName(name) || name.trim().toLowerCase()
}

export function areVerticalGroupKeysSimilar(first: string, second: string) {
  if (first === second) return true

  const firstTokens = first.split(" ").filter(Boolean)
  const secondTokens = second.split(" ").filter(Boolean)
  const overlap = firstTokens.filter((token) => secondTokens.includes(token)).length
  const longestLength = Math.max(firstTokens.length, secondTokens.length)

  return longestLength > 0 && overlap / longestLength >= 0.8
}

export function findSimilarVerticalGroupKey(keys: Iterable<string>, name: string) {
  const key = getVerticalGroupKey(name)
  return Array.from(keys).find((existingKey) => areVerticalGroupKeysSimilar(existingKey, key)) ?? key
}

export function averageUnitScore(lotes: SupervisorLoteSummary[]) {
  const scored = lotes.filter((lote): lote is SupervisorLoteSummary & { unitScore: number } => lote.unitScore !== null)
  return scored.length ? Math.round(scored.reduce((sum, lote) => sum + lote.unitScore, 0) / scored.length) : null
}

export function formatScore(value: number | null | undefined) {
  return value !== null && value !== undefined ? `${value}%` : "S/D"
}

export function formatCompactList(values: string[], emptyLabel = "Sin datos") {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)))
  if (uniqueValues.length === 0) return emptyLabel
  if (uniqueValues.length <= 3) return uniqueValues.join(", ")
  return `${uniqueValues.slice(0, 3).join(", ")} +${uniqueValues.length - 3}`
}

export function getControlDetailLabel(control: SupervisorVerticalScore["controls"][number], verticalName: string) {
  const category = getSummaryControlCategory(control, verticalName)

  if (category === "producto") return getControlProductLabels(control).join(", ")
  if (category === "proceso") return getControlProcessLabel(control)

  return control.identificador || "Control sin nombre"
}

export function buildCeoCycleVerticalDetails(lote: SupervisorLoteSummary | undefined, selectedVerticalId: string): CeoCycleVerticalDetail[] {
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

export function formatDelta(delta: number | null) {
  if (delta === null) return "-"
  const sign = delta > 0 ? "+" : ""
  return `${sign}${delta} pts`
}

// Indicadores y paneles reutilizables de la vista del analista.

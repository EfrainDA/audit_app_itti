// Cálculos puros del dashboard. Los umbrales configurados determinan tonos,
// semáforos y rangos; los valores por defecto solo protegen instalaciones vacías.
import type { Ciclo, Umbral } from "@/lib/data"

const YEAR_KEY = "a\u00f1o" as const

const DEFAULT_SCORE_THRESHOLDS: Umbral[] = [
  { id: "default-critical", nombre: "Crítico", min: 0, max: 59, color: "rojo" },
  { id: "default-acceptable", nombre: "Aceptable", min: 60, max: 84, color: "amarillo" },
  { id: "default-optimal", nombre: "Óptimo", min: 85, max: 100, color: "verde" },
]

export type CountMetrics = {
  total: number
  pending: number
  inCourse: number
  completed: number
  started: number
  risk: number
  score: number
  progressPct: number
}

type CountableControl = {
  id: string
  estado: string
  scoreControl?: number
}

function getVirtualCurrentCycle(): Ciclo {
  const today = new Date()
  const year = today.getFullYear()
  const bimester = Math.floor(today.getMonth() / 2) + 1
  const startMonth = (bimester - 1) * 2

  return {
    id: "virtual-current-cycle",
    [YEAR_KEY]: year,
    bimestre: bimester,
    mesInicio: startMonth + 1,
    mesFin: startMonth + 2,
    fechaInicio: new Date(year, startMonth, 1).toISOString().slice(0, 10),
    fechaFin: new Date(year, startMonth + 2, 0).toISOString().slice(0, 10),
  }
}

export function getActiveCycle(cycles: Ciclo[]): Ciclo {
  const today = new Date()
  return cycles.find((cycle) => {
    const start = new Date(`${cycle.fechaInicio}T00:00:00`)
    const end = new Date(`${cycle.fechaFin}T23:59:59`)
    return today >= start && today <= end
  }) ?? cycles[cycles.length - 1] ?? getVirtualCurrentCycle()
}

export function getCounts(controls: CountableControl[], answeredControlIds: Set<string> = new Set()): CountMetrics {
  const completed = controls.filter((control) => control.estado === "terminado" || control.estado === "terminada").length
  const isStarted = (control: CountableControl) =>
    control.estado === "en_curso" || control.estado === "en_replica" || answeredControlIds.has(control.id)
  const inCourse = controls.filter((control) =>
    control.estado !== "terminado" && control.estado !== "terminada" && isStarted(control)
  ).length
  const pending = controls.length - completed - inCourse
  const started = completed + inCourse
  const scored = controls.filter((control) => control.scoreControl !== undefined)
  const score = scored.length
    ? Math.round(scored.reduce((sum, control) => sum + (control.scoreControl ?? 0), 0) / scored.length)
    : 0

  return {
    total: controls.length,
    pending,
    inCourse,
    completed,
    started,
    risk: pending + controls.filter((control) => (control.scoreControl ?? 100) < 71).length,
    score,
    progressPct: controls.length ? Math.round((started / controls.length) * 100) : 0,
  }
}

export function getDaysUntil(date: string) {
  const diff = new Date(`${date}T23:59:59`).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function getSemaphore(progress: number) {
  if (progress >= 80) return { label: "Óptimo", text: "text-status-success-text", bg: "bg-status-success-solid" }
  if (progress >= 50) return { label: "Aceptable", text: "text-status-warning-text", bg: "bg-status-warning-solid" }
  return { label: "Crítico", text: "text-status-danger-text", bg: "bg-status-danger-solid" }
}

export function getConfiguredScoreThresholds(thresholds: Umbral[] = []) {
  const configured = thresholds
    .filter((threshold) =>
      Number.isFinite(threshold.min)
      && Number.isFinite(threshold.max)
      && threshold.min >= 0
      && threshold.max <= 100
      && threshold.min <= threshold.max,
    )
    .sort((first, second) => first.min - second.min)

  return configured.length ? configured : DEFAULT_SCORE_THRESHOLDS
}

export function getThresholdRangeLabel(threshold: Umbral) {
  if (threshold.min === 0) return `${threshold.nombre} ≤ ${threshold.max}%`
  if (threshold.max === 100) return `${threshold.nombre} ≥ ${threshold.min}%`
  return `${threshold.nombre} ${threshold.min}-${threshold.max}%`
}

export function getThresholdTone(color: Umbral["color"]) {
  if (color === "verde") {
    return { text: "text-status-success-text", bg: "bg-status-success-solid", soft: "bg-status-success-surface", border: "border-status-success-border", fill: "var(--status-success-solid)" }
  }
  if (color === "amarillo") {
    return { text: "text-status-warning-text", bg: "bg-status-warning-solid", soft: "bg-status-warning-surface", border: "border-status-warning-border", fill: "var(--status-warning-solid)" }
  }
  return { text: "text-status-danger-text", bg: "bg-status-danger-solid", soft: "bg-status-danger-surface", border: "border-status-danger-border", fill: "var(--status-danger-solid)" }
}

export function getExecutiveScoreTone(
  score: number | null | undefined,
  thresholds: Umbral[] = [],
) {
  if (score === null || score === undefined) {
    return { label: "Sin dato", text: "text-muted-foreground", bg: "bg-muted", soft: "bg-muted/20", border: "border-border/60", fill: "var(--muted-foreground)" }
  }

  const configured = getConfiguredScoreThresholds(thresholds)
  const threshold = configured.find((item) => score >= item.min && score <= item.max)
    ?? configured.find((item) => score <= item.max)
    ?? configured.at(-1)!

  return { label: threshold.nombre, threshold, ...getThresholdTone(threshold.color) }
}

"use client"

// Distribución ejecutiva de parámetros por resultado. El diálogo permite
// inspeccionar los elementos de cada categoría sin sobrecargar el gráfico.
import { CheckCircle2, ChevronRight, CircleAlert, CircleDot } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getThresholdTone } from "@/features/dashboard/domain/metrics"
import { cn } from "@/lib/utils"
import type {
  ParameterDistribution,
  ParameterDistributionDetail,
} from "./dashboard-model"

type ParameterOutcome = "cumple" | "intermedio" | "noCumple"

const OUTCOME_CONFIG = {
  cumple: {
    label: "Cumplidos",
    description: "Parámetros que alcanzaron el resultado esperado.",
    icon: CheckCircle2,
    tone: getThresholdTone("verde"),
  },
  intermedio: {
    label: "Parciales",
    description: "Parámetros con cumplimiento parcial.",
    icon: CircleDot,
    tone: getThresholdTone("amarillo"),
  },
  noCumple: {
    label: "Incumplidos",
    description: "Parámetros que requieren atención prioritaria.",
    icon: CircleAlert,
    tone: getThresholdTone("rojo"),
  },
} satisfies Record<ParameterOutcome, {
  label: string
  description: string
  icon: typeof CheckCircle2
  tone: ReturnType<typeof getThresholdTone>
}>

export function CeoParameterDistribution({
  distribution,
  details,
}: {
  distribution: ParameterDistribution
  details: ParameterDistributionDetail[]
}) {
  const [selectedOutcome, setSelectedOutcome] = useState<ParameterOutcome | null>(null)
  const pct = (value: number) => distribution.total ? Math.round((value / distribution.total) * 100) : 0
  const outcomes = (Object.keys(OUTCOME_CONFIG) as ParameterOutcome[]).map((key) => ({
    key,
    ...OUTCOME_CONFIG[key],
    value: distribution[key],
    pct: pct(distribution[key]),
  }))
  const activeOutcome = selectedOutcome ? OUTCOME_CONFIG[selectedOutcome] : null
  const activeDetails = selectedOutcome
    ? details.filter((detail) => detail[selectedOutcome] > 0)
      .sort((first, second) => second[selectedOutcome] - first[selectedOutcome] || first.name.localeCompare(second.name))
    : []
  const redPct = pct(distribution.noCumple)
  const chartBackground = distribution.total
    ? `conic-gradient(var(--status-success-solid) 0 ${outcomes[0].pct}%, var(--status-warning-solid) ${outcomes[0].pct}% ${outcomes[0].pct + outcomes[1].pct}%, var(--status-danger-solid) ${outcomes[0].pct + outcomes[1].pct}% 100%)`
    : "var(--muted)"

  return (
    <>
      <Card className="overflow-hidden border-border/70 bg-card py-0 shadow-none">
        <CardHeader className="border-b border-border/60 px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Distribución de parámetros
          </CardTitle>
          <p className="text-xs text-muted-foreground">Selecciona un resultado para revisar sus parámetros.</p>
        </CardHeader>
        <CardContent className="grid gap-6 px-5 py-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col items-center">
            <div
              className="relative h-44 w-44 rounded-full"
              style={{ background: chartBackground }}
              role="img"
              aria-label={`${distribution.total} parámetros evaluados`}
            >
              <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full border border-border/50 bg-card px-3 text-center">
                <span className="text-[2rem] font-semibold leading-none tabular-nums">{distribution.total}</span>
                <span className="mt-2 text-xs font-medium uppercase leading-none tracking-[0.12em] text-muted-foreground">
                  Parámetros
                </span>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Respuestas clasificadas del período seleccionado</p>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {outcomes.map((outcome) => {
                const Icon = outcome.icon
                return (
                  <button
                    key={outcome.key}
                    type="button"
                    onClick={() => setSelectedOutcome(outcome.key)}
                    className={cn(
                      "group min-w-0 rounded-lg border p-3 text-left transition-[border-color,background-color,box-shadow] hover:shadow-[var(--elevation-1)] focus-visible:outline-none",
                      outcome.tone.border,
                      outcome.tone.soft,
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-md bg-card", outcome.tone.text)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <span className="mt-3 block truncate text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">{outcome.label}</span>
                    <span className="mt-1 flex items-baseline justify-between gap-2">
                      <span className={cn("text-2xl font-semibold leading-none tabular-nums", outcome.tone.text)}>{outcome.value}</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">{outcome.pct}%</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className={cn(
              "rounded-lg border px-4 py-3 text-sm",
              redPct ? "border-status-danger-border bg-status-danger-surface" : "border-status-success-border bg-status-success-surface",
            )}>
              <p className={cn("font-semibold", redPct ? "text-status-danger-text" : "text-status-success-text")}>
                {distribution.total === 0
                  ? "Todavía no hay parámetros evaluados."
                  : redPct
                    ? `${redPct}% de los parámetros están incumplidos.`
                    : "No hay parámetros incumplidos en esta selección."}
              </p>
              {distribution.total > 0 && redPct > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Prioriza los incumplidos y convierte los parciales en cumplidos.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={selectedOutcome !== null} onOpenChange={(open) => { if (!open) setSelectedOutcome(null) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="pr-10 text-left">
            <DialogTitle>{activeOutcome?.label ?? "Parámetros"}</DialogTitle>
            <DialogDescription>{activeOutcome?.description}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {selectedOutcome && activeDetails.map((detail) => (
              <div key={detail.key} className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/15 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">{detail.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail.unitName} · {detail.verticalName}</p>
                </div>
                <Badge variant="outline" className={cn("shrink-0", activeOutcome?.tone.border, activeOutcome?.tone.soft, activeOutcome?.tone.text)}>
                  {detail[selectedOutcome]} de {detail.total}
                </Badge>
              </div>
            ))}
            {activeDetails.length === 0 && (
              <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                No hay parámetros en esta categoría para los filtros activos.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

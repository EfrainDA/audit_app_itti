"use client"

// Editor de rangos semánticos consumidos por todos los dashboards.
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Umbral } from "@/lib/data"
import type { Dispatch, SetStateAction } from "react"
import { SettingsSectionHeader } from "./settings-section-header"

export type ThresholdDrafts = Record<string, { min: number; max: number }>

type ThresholdSettingsPanelProps = {
  thresholds: Umbral[]
  drafts: ThresholdDrafts
  setDrafts: Dispatch<SetStateAction<ThresholdDrafts>>
  canManage: boolean
  isSaving: boolean
  error: string | null
  success: string | null
  onSave: () => void
}

function thresholdTone(color: Umbral["color"]) {
  if (color === "rojo") return { border: "border-t-status-danger-solid", dot: "bg-status-danger-solid" }
  if (color === "amarillo") return { border: "border-t-status-warning-solid", dot: "bg-status-warning-solid" }
  return { border: "border-t-status-success-solid", dot: "bg-status-success-solid" }
}

export function ThresholdSettingsPanel({
  thresholds,
  drafts,
  setDrafts,
  canManage,
  isSaving,
  error,
  success,
  onSave,
}: ThresholdSettingsPanelProps) {
  return (
    <div className="space-y-3">
      <SettingsSectionHeader
        title="Umbrales de Calidad (Semáforo)"
        description="Configura los rangos utilizados para clasificar los resultados."
      />
      <Card className="border-border/70 bg-card py-0 shadow-none">
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {thresholds.map((threshold) => {
              const tone = thresholdTone(threshold.color)
              return (
                <Card key={threshold.id} className={`border-border/70 border-t-2 bg-card py-0 shadow-none ${tone.border}`}>
                  <CardContent className="p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold">{threshold.nombre}</h3>
                      <div className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(["min", "max"] as const).map((field) => (
                        <div key={field}>
                          <Label className="text-xs text-muted-foreground">{field === "min" ? "Mínimo" : "Máximo"}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={drafts[threshold.id]?.[field] ?? threshold[field]}
                            disabled={!canManage}
                            onChange={(event) => {
                              const value = Number(event.target.value)
                              setDrafts((current) => ({
                                ...current,
                                [threshold.id]: {
                                  min: field === "min" ? value : current[threshold.id]?.min ?? threshold.min,
                                  max: field === "max" ? value : current[threshold.id]?.max ?? threshold.max,
                                },
                              }))
                            }}
                            className="mt-1 bg-card"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          {error && <p className="text-sm text-status-danger-text">{error}</p>}
          {success && <p className="text-sm text-status-success-text">{success}</p>}
          <div className="flex justify-end">
            <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto" onClick={onSave} disabled={!canManage || isSaving}>
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import type { Umbral } from "@/lib/data"
import { getErrorMessage } from "@/lib/error-message"
import { updateThresholds } from "@/lib/repositories/supabase/settings"
import { useState } from "react"
import { useSWRConfig } from "swr"
import { ThresholdSettingsPanel, type ThresholdDrafts } from "./threshold-settings-panel"

export function ThresholdsSettings({ thresholds, canManage, onChanged }: { thresholds: Umbral[]; canManage: boolean; onChanged: () => Promise<void> }) {
  const { mutate } = useSWRConfig()
  const [drafts, setDrafts] = useState<ThresholdDrafts>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    setError(null)
    setSuccess(null)
    const values = thresholds.map((threshold) => ({ ...threshold, ...drafts[threshold.id] })).sort((a, b) => a.min - b.min)
    if (!values.length) return setError("No hay umbrales configurados.")
    if (values.some((item) => !Number.isInteger(item.min) || !Number.isInteger(item.max) || item.min < 0 || item.max > 100 || item.min > item.max)) {
      return setError("Todos los rangos deben usar enteros válidos entre 0 y 100.")
    }
    if (values[0].min !== 0 || values.at(-1)?.max !== 100 || values.some((item, index) => index > 0 && item.min !== values[index - 1].max + 1)) {
      return setError("Los rangos deben cubrir 0–100 sin huecos ni superposiciones.")
    }
    setIsSaving(true)
    try {
      await updateThresholds(values)
      await onChanged()
      await mutate((key) => Array.isArray(key) && key[0] === "app-data")
      setDrafts({})
      setSuccess("Umbrales actualizados correctamente.")
    } catch (cause) {
      setError(getErrorMessage(cause, "No se pudieron guardar los umbrales."))
    } finally {
      setIsSaving(false)
    }
  }

  return <ThresholdSettingsPanel thresholds={thresholds} drafts={drafts} setDrafts={setDrafts} canManage={canManage} isSaving={isSaving} error={error} success={success} onSave={save} />
}

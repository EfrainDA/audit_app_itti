"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2 } from "lucide-react"
import { useAppData } from "@/hooks/use-app-data"
import { createLot } from "@/lib/supabase-data"
import { getErrorMessage } from "@/lib/error-message"

const cycleLabels: Record<number, string> = {
  1: "Ciclo 1 (Ene - Feb)",
  2: "Ciclo 2 (Mar - Abr)",
  3: "Ciclo 3 (May - Jun)",
  4: "Ciclo 4 (Jul - Ago)",
  5: "Ciclo 5 (Sep - Oct)",
  6: "Ciclo 6 (Nov - Dic)",
}

function getCurrentBimester(date = new Date()) {
  return Math.floor(date.getMonth() / 2) + 1
}

interface LoteFormProps {
  onClose: () => void
  onSaved?: () => Promise<void> | void
}

export function LoteForm({ onClose, onSaved }: LoteFormProps) {
  const { data, refresh } = useAppData()
  const [unidadId, setUnidadId] = useState("")
  const [año, setAño] = useState("2026")
  const [ciclo, setCiclo] = useState("")
  const [modeloId, setModeloId] = useState("")
  const [auditores, setAuditores] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unidades = data.unidades
  const activeCycle = useMemo(() => {
    const today = new Date()
    const todayTime = today.getTime()
    const configuredCycle = data.ciclos.find((item) => {
      const start = new Date(`${item.fechaInicio}T00:00:00`).getTime()
      const end = new Date(`${item.fechaFin}T23:59:59`).getTime()
      return todayTime >= start && todayTime <= end
    })

    return configuredCycle ?? {
      id: "current-cycle",
      año: today.getFullYear(),
      bimestre: getCurrentBimester(today),
      fechaInicio: "",
      fechaFin: "",
    }
  }, [data.ciclos])

  const auditoresDisponibles = data.users.filter((u) => u.role === "auditor" && u.status === "activo")
  const modelosPublicados = data.modelos.filter((m) => m.estado === "publicado")

  useEffect(() => {
    setAño(String(activeCycle.año))
    setCiclo(String(activeCycle.bimestre))
  }, [activeCycle.año, activeCycle.bimestre])

  const toggleAuditor = (auditorId: string) => {
    setAuditores(
      auditores.includes(auditorId)
        ? auditores.filter((id) => id !== auditorId)
        : [...auditores, auditorId]
    )
  }

  const handleSubmit = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      await createLot({
        businessUnitId: unidadId,
        modelId: modeloId,
        year: Number(año),
        bimester: Number(ciclo),
        auditorIds: auditores,
      })
      await refresh()
      await onSaved?.()
      onClose()
    } catch (submitError) {
      setError(getErrorMessage(submitError, "No se pudo crear el lote."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Unidad de Negocio *</Label>
          <Select value={unidadId} onValueChange={setUnidadId}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Selecciona una unidad" />
            </SelectTrigger>
            <SelectContent>
              {unidades.map((unidad) => (
                <SelectItem key={unidad.id} value={unidad.id}>
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-10 items-center justify-center overflow-hidden rounded border border-primary/20 bg-primary/10">
                      {unidad.logo ? (
                        <img src={unidad.logo} alt={unidad.nombre} className="h-full w-full object-contain" />
                      ) : (
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                      )}
                    </span>
                    <span className="flex flex-col">
                      <span>{unidad.nombre}</span>
                      <span className="text-xs text-muted-foreground">{unidad.ecosistema}</span>
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Año *</Label>
          <Select value={año} onValueChange={setAño} disabled>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(activeCycle.año)}>{activeCycle.año}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ciclo de Control *</Label>
          <Select value={ciclo} onValueChange={setCiclo}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Selecciona el ciclo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(activeCycle.bimestre)}>
                {cycleLabels[activeCycle.bimestre] ?? `Ciclo ${activeCycle.bimestre}`}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Modelo de Control *</Label>
          <Select value={modeloId} onValueChange={setModeloId}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Selecciona un modelo" />
            </SelectTrigger>
            <SelectContent>
              {modelosPublicados.map((modelo) => (
                <SelectItem key={modelo.id} value={modelo.id}>
                  {modelo.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Analistas o especialistas de Control de Calidad asignados *</Label>
        <p className="text-sm text-muted-foreground">
          Selecciona los analistas o especialistas que participarán en este lote
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {auditoresDisponibles.map((auditor) => (
            <div
              key={auditor.id}
              className="flex min-w-0 items-center gap-3 rounded-lg bg-secondary p-3 hover:bg-secondary/80 cursor-pointer"
              onClick={() => toggleAuditor(auditor.id)}
            >
              <Checkbox
                id={auditor.id}
                checked={auditores.includes(auditor.id)}
                onClick={(event) => event.stopPropagation()}
                onCheckedChange={() => toggleAuditor(auditor.id)}
              />
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-sm font-semibold text-primary">
                {auditor.avatar ? (
                  <img src={auditor.avatar} alt={auditor.name} className="h-full w-full object-cover" />
                ) : (
                  <span>
                    {auditor.name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor={auditor.id} className="block truncate text-sm font-medium cursor-pointer">
                  {auditor.name}
                </label>
                <p className="truncate text-xs text-muted-foreground">{auditor.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-4 border-t border-border sm:flex-row sm:justify-end">
        {error && <p className="text-sm text-destructive sm:mr-auto">{error}</p>}
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={handleSubmit}
          disabled={isSubmitting || !unidadId || !ciclo || !modeloId || auditores.length === 0}
        >
          {isSubmitting ? "Creando..." : "Crear Lote"}
        </Button>
      </div>
    </div>
  )
}

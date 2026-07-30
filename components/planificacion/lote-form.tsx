"use client"

// Formulario de alta que vincula ciclo, modelo, unidad y equipo auditor.
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
import { SafeImage } from "@/components/ui/safe-image"
import { useAppData } from "@/hooks/use-app-data"
import { createLot } from "@/lib/repositories/supabase/planning"
import { getErrorMessage } from "@/lib/error-message"

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

// Sugiere el bimestre calendario actual como valor inicial.
function getCurrentBimester(date = new Date()) {
  return Math.floor(date.getMonth() / 2) + 1
}

interface LoteFormProps {
  onClose: () => void
  onSaved?: () => Promise<void> | void
}

export function LoteForm({ onClose, onSaved }: LoteFormProps) {
  const { data, refresh } = useAppData({ domains: ["users", "settings", "models", "planning"] })
  const [unidadId, setUnidadId] = useState("")
  const [año, setAño] = useState("2026")
  const [ciclo, setCiclo] = useState("")
  const [modeloId, setModeloId] = useState("")
  const [auditores, setAuditores] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unidades = data.unidades
  const enabledCycles = useMemo(() => {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const configuredCycles = data.ciclos
      .filter((item) => (item.estado ?? "habilitado") === "habilitado" && new Date(`${item.fechaFin}T23:59:59`).getTime() >= todayStart)
      .sort((first, second) => {
        if (first.año !== second.año) return first.año - second.año
        return first.bimestre - second.bimestre
      })

    return configuredCycles.length > 0 ? configuredCycles : []
  }, [data.ciclos])
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
      mesInicio: today.getMonth() + 1,
      mesFin: today.getMonth() + 1,
    }
  }, [data.ciclos])
  const availableCycles = useMemo(
    () => enabledCycles.length > 0 ? enabledCycles : [activeCycle],
    [activeCycle, enabledCycles],
  )
  const availableYears = useMemo(
    () => Array.from(new Set(availableCycles.map((item) => item.año))).sort((first, second) => first - second),
    [availableCycles],
  )
  const cyclesForSelectedYear = useMemo(
    () => availableCycles.filter((item) => String(item.año) === año),
    [año, availableCycles],
  )

  const auditoresDisponibles = data.users.filter((u) => u.role === "auditor" && u.status === "activo")
  const modelosPublicados = data.modelos.filter((m) => m.estado === "publicado")

  useEffect(() => {
    const selectedCycle = availableCycles[0]
    setAño(String(selectedCycle.año))
    setCiclo(String(selectedCycle.bimestre))
  }, [availableCycles])

  const handleYearChange = (value: string) => {
    setAño(value)
    const firstCycleForYear = availableCycles.find((item) => String(item.año) === value)
    setCiclo(firstCycleForYear ? String(firstCycleForYear.bimestre) : "")
  }

  const handleCycleChange = (value: string) => {
    setCiclo(value)
  }

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
                        <SafeImage src={unidad.logo} alt={unidad.nombre} className="h-full w-full object-contain" />
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
          <Select value={año} onValueChange={handleYearChange} disabled={availableYears.length <= 1}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((cycleYear) => (
                <SelectItem key={cycleYear} value={String(cycleYear)}>{cycleYear}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ciclo de Control *</Label>
          <Select value={ciclo} onValueChange={handleCycleChange}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Selecciona el ciclo" />
            </SelectTrigger>
            <SelectContent>
              {cyclesForSelectedYear.map((cycle) => (
                <SelectItem key={cycle.id} value={String(cycle.bimestre)}>
                  {monthNames[cycle.mesInicio - 1]} - {monthNames[cycle.mesFin - 1]} ({cycle.año})
                </SelectItem>
              ))}
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
          {auditoresDisponibles.map((auditor) => {
            const selected = auditores.includes(auditor.id)

            return (
              <div
                key={auditor.id}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  selected
                    ? "border-primary/45 bg-primary/10"
                    : "border-transparent bg-secondary hover:border-border hover:bg-secondary/80"
                }`}
                onClick={() => toggleAuditor(auditor.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    toggleAuditor(auditor.id)
                  }
                }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-sm font-semibold text-primary">
                  {auditor.avatar ? (
                    <SafeImage src={auditor.avatar} alt={auditor.name} className="h-full w-full object-cover" />
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
                  <span className="block truncate text-sm font-medium">
                    {auditor.name}
                  </span>
                  <p className="truncate text-xs text-muted-foreground">{auditor.email}</p>
                </div>
                <Checkbox
                  id={auditor.id}
                  checked={selected}
                  className="shrink-0"
                  onClick={(event) => event.stopPropagation()}
                  onCheckedChange={() => toggleAuditor(auditor.id)}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-4 border-t border-border sm:flex-row sm:justify-end">
        {error && <p className="text-sm text-status-danger-text sm:mr-auto">{error}</p>}
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

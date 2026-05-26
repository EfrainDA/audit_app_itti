"use client"

import { useMemo, useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Plus, 
  User, 
  Pencil,
  Trash2, 
  FileCheck, 
  Clock, 
  CheckCircle2,
  LayoutList 
} from "lucide-react"
import {
  type Lote,
  type Control,
  type LoteVertical,
  getEstadoBadgeColor,
  getScoreColor,
  formatEstado,
} from "@/lib/data"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import { addLotAuditor, createControl, deleteControl, updateControl } from "@/lib/supabase-data"
import { getErrorMessage } from "@/lib/error-message"

const CONTROL_TAGS: NonNullable<Control["etiqueta"]>[] = [
  "Unidad de Negocio",
  "Producto",
  "Proceso",
  "Proceso de apoyo",
]

const isProcessTag = (tag: Control["etiqueta"]) => tag === "Proceso" || tag === "Proceso de apoyo"
const isBusinessUnitTag = (tag: Control["etiqueta"]) => tag === "Unidad de Negocio"

const buildBusinessUnitControlName = (recibe: string, presta: string) => {
  if (!recibe || !presta) return ""
  return `${recibe} - ${presta}`
}

const splitBusinessUnitControlName = (name: string) => {
  const [recibe = "", presta = ""] = name.split(" - ")
  return { recibe, presta }
}

interface LoteDetailProps {
  lote: Lote
  onChanged?: () => Promise<void> | void
}

export function LoteDetail({ lote, onChanged }: LoteDetailProps) {
  const { data, refresh } = useAppData()
  const { appUser } = useAuth()
  const canManageLots = appUser?.role === "admin" || appUser?.role === "supervisor"
  const canManageControls = appUser?.role === "admin" || appUser?.role === "supervisor" || appUser?.role === "auditor"
  const currentLote = data.lotes.find((item) => item.id === lote.id) ?? lote
  const modelo = data.modelos.find((m) => m.id === currentLote.modeloControlId)
  const auditores = currentLote.auditores
    .map((id) => data.users.find((u) => u.id === id))
    .filter((auditor): auditor is (typeof data.users)[number] => Boolean(auditor))
  const auditoresDisponibles = data.users.filter(
    (user) => user.role === "auditor" && user.status === "activo" && !currentLote.auditores.includes(user.id),
  )
  
  // Estado local para simular agregar controles
  const [loteVerticales, setLoteVerticales] = useState<LoteVertical[]>(() => {
    // Obtener verticales existentes del lote o crear nuevas basadas en el modelo
    const existentes = data.loteVerticales.filter((lv) => lv.loteId === lote.id)
    
    // Crear verticales vacías basadas en el modelo
    return modelo?.verticales.map((v, idx) => ({
      id: existentes.find((lv) => lv.verticalId === v.id)?.id ?? `lv-new-${idx}`,
      loteId: lote.id,
      verticalId: v.id,
      controles: existentes.find((lv) => lv.verticalId === v.id)?.controles ?? []
    })) || []
  })

  useEffect(() => {
    const existentes = data.loteVerticales.filter((lv) => lv.loteId === lote.id)
    setLoteVerticales(
      modelo?.verticales.map((v, idx) => ({
        id: existentes.find((lv) => lv.verticalId === v.id)?.id ?? `lv-new-${idx}`,
        loteId: lote.id,
        verticalId: v.id,
        controles: existentes.find((lv) => lv.verticalId === v.id)?.controles ?? [],
      })) || [],
    )
  }, [data.loteVerticales, lote.id, modelo])

  const initialNewControl = {
    identificador: "",
    etiqueta: "Unidad de Negocio" as NonNullable<Control["etiqueta"]>,
    auditorId: "",
    correspondeProceso: false,
    proceso: "",
    subprocesos: [] as string[],
    subprocesoTemp: "",
    productosVinculados: [] as string[],
    unidadPrestaServicio: "",
    unidadRecibeServicio: "",
  }

  const [showAddControl, setShowAddControl] = useState<string | null>(null)
  const [newControl, setNewControl] = useState(initialNewControl)
  const [editingControl, setEditingControl] = useState<{ loteVerticalId: string; controlId: string } | null>(null)
  const [editControl, setEditControl] = useState(initialNewControl)
  const [isControlSuggestionsOpen, setIsControlSuggestionsOpen] = useState(false)
  const [isProcessSuggestionsOpen, setIsProcessSuggestionsOpen] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSavingControl, setIsSavingControl] = useState(false)
  const [auditorToAdd, setAuditorToAdd] = useState("")
  const [isAddingAuditor, setIsAddingAuditor] = useState(false)

  // Implementación de autoguardado con debounce (retraso de 1.5s)
  useEffect(() => {
    if (loteVerticales.length > 0) setAutoSaveStatus('saved')
  }, [loteVerticales])

  const controlsForCurrentUnit = useMemo(() => {
    const loteIdsForUnidad = data.lotes
      .filter((unitLot) => unitLot.unidadNegocioId === lote.unidadNegocioId)
      .map((unitLot) => unitLot.id)

    const persistedControls = data.loteVerticales
      .filter((lv) => loteIdsForUnidad.includes(lv.loteId))
      .flatMap((lv) => lv.controles)

    const localControls = loteVerticales.flatMap((lv) => lv.controles)

    return [...persistedControls, ...localControls]
  }, [data.lotes, data.loteVerticales, lote.unidadNegocioId, loteVerticales])

  const existingControlNames = useMemo(() => {
    const names = controlsForCurrentUnit
      .filter((control) => (control.etiqueta ?? "Unidad de Negocio") === newControl.etiqueta)
      .map((control) => control.identificador)
      .filter((name) => name.trim().length > 0)
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }, [controlsForCurrentUnit, newControl.etiqueta])

  const filteredControlNames = existingControlNames.filter((name) =>
    name.toLowerCase().includes(newControl.identificador.trim().toLowerCase())
  )
  const hasExactControlMatch = existingControlNames.some(
    (name) => name.toLowerCase() === newControl.identificador.trim().toLowerCase()
  )

  const existingProcessNames = useMemo(() => {
    const names = controlsForCurrentUnit
      .filter((control) => (control.etiqueta ?? "Unidad de Negocio") === newControl.etiqueta)
      .map((control) => control.proceso || (control.correspondeProceso ? control.identificador : undefined))
      .filter((process): process is string => Boolean(process?.trim()))
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }, [controlsForCurrentUnit, newControl.etiqueta])

  const filteredProcessNames = existingProcessNames.filter((name) =>
    name.toLowerCase().includes(newControl.proceso.trim().toLowerCase())
  )
  const hasExactProcessMatch = existingProcessNames.some(
    (name) => name.toLowerCase() === newControl.proceso.trim().toLowerCase()
  )

  const productControls = useMemo(() => {
    return loteVerticales
      .flatMap((lv) => lv.controles)
      .filter((control) => control.etiqueta === "Producto")
      .map((control) => control.producto || control.identificador)
      .filter((name): name is string => Boolean(name?.trim()))
      .filter((name, index, items) => items.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index)
      .sort((a, b) => a.localeCompare(b))
  }, [loteVerticales])
  const businessUnitOptions = data.unidades.map((unit) => unit.nombre).sort((a, b) => a.localeCompare(b))

  const toggleLinkedProduct = (
    current: string[],
    product: string,
    onChange: (nextProducts: string[]) => void,
  ) => {
    onChange(
      current.includes(product)
        ? current.filter((item) => item !== product)
        : [...current, product],
    )
  }

  const getControlValidationError = (control: typeof initialNewControl) => {
    if (!control.etiqueta) return "Selecciona una etiqueta."
    if (!control.auditorId) return "Selecciona un analista o especialista de Control de Calidad."

    if (isBusinessUnitTag(control.etiqueta)) {
      if (!control.unidadRecibeServicio) return "Selecciona la unidad de negocio que recibe el servicio."
      if (!control.unidadPrestaServicio) return "Selecciona la unidad de negocio que presta el servicio."
      if (!buildBusinessUnitControlName(control.unidadRecibeServicio, control.unidadPrestaServicio).trim()) {
        return "Completa las unidades de negocio para generar el nombre del control."
      }
      return null
    }

    if (isProcessTag(control.etiqueta)) {
      if (!control.proceso.trim()) return "Completa el nombre del proceso."
      if (control.subprocesos.length === 0) return "Agrega al menos un subproceso."
      if (control.etiqueta !== "Proceso de apoyo" && productControls.length > 0 && control.productosVinculados.length === 0) {
        return "Selecciona al menos un producto vinculado."
      }
      return null
    }

    if (!control.identificador.trim()) return "Completa el nombre del control."
    return null
  }

  const handleAddControl = async (loteVerticalId: string) => {
    const validationError = getControlValidationError(newControl)
    if (validationError) {
      setFormError(validationError)
      return
    }

    const correspondeProceso = isProcessTag(newControl.etiqueta)
    const identificador = correspondeProceso
      ? newControl.proceso.trim()
      : isBusinessUnitTag(newControl.etiqueta)
        ? buildBusinessUnitControlName(newControl.unidadRecibeServicio, newControl.unidadPrestaServicio).trim()
        : newControl.identificador.trim()
    if (!identificador) return

    const targetVertical = loteVerticales.find((lv) => lv.id === loteVerticalId)
    setFormError(null)
    setIsSavingControl(true)

    try {
      await createControl({
        lotVerticalId: loteVerticalId,
        lotId: lote.id,
        verticalId: targetVertical?.verticalId,
        identifier: identificador,
        tag: newControl.etiqueta,
        correspondsToProcess: correspondeProceso,
        process: correspondeProceso ? newControl.proceso : undefined,
        subprocesses: correspondeProceso ? newControl.subprocesos : undefined,
        linkedProducts:
          correspondeProceso && newControl.etiqueta !== "Proceso de apoyo"
            ? newControl.productosVinculados
            : [],
        auditorId: newControl.auditorId || undefined,
      })
      await refresh()
      setNewControl(initialNewControl)
      setIsControlSuggestionsOpen(false)
      setIsProcessSuggestionsOpen(false)
      setShowAddControl(null)
    } catch (submitError) {
      setFormError(getErrorMessage(submitError, "No se pudo guardar el control."))
    } finally {
      setIsSavingControl(false)
    }
  }

  const handleDeleteControl = async (_loteVerticalId: string, controlId: string) => {
    await deleteControl(controlId)
    await refresh()
  }

  const openEditControl = (loteVerticalId: string, control: Control) => {
    const subprocesos = control.subprocesos ?? control.subproceso?.split(",").map((subproceso) => subproceso.trim()).filter(Boolean) ?? []
    const controlIsProcess = isProcessTag(control.etiqueta) || Boolean(control.correspondeProceso)
    const businessUnits = isBusinessUnitTag(control.etiqueta) ? splitBusinessUnitControlName(control.identificador) : { recibe: "", presta: "" }

    setEditingControl({ loteVerticalId, controlId: control.id })
    setEditControl({
      identificador: control.identificador,
      etiqueta: control.etiqueta ?? "Unidad de Negocio",
      auditorId: control.auditorId || "",
      correspondeProceso: controlIsProcess,
      proceso: controlIsProcess ? control.proceso || control.identificador : control.proceso || "",
      subprocesos,
      subprocesoTemp: "",
      productosVinculados: control.productosVinculados ?? [],
      unidadPrestaServicio: businessUnits.presta,
      unidadRecibeServicio: businessUnits.recibe,
    })
  }

  const handleUpdateControl = async () => {
    if (!editingControl) return
    const validationError = getControlValidationError(editControl)
    if (validationError) {
      setFormError(validationError)
      return
    }

    const correspondeProceso = isProcessTag(editControl.etiqueta)
    const identificador = correspondeProceso
      ? editControl.proceso.trim()
      : isBusinessUnitTag(editControl.etiqueta)
        ? buildBusinessUnitControlName(editControl.unidadRecibeServicio, editControl.unidadPrestaServicio).trim()
        : editControl.identificador.trim()
    if (!identificador) return

    setFormError(null)
    setIsSavingControl(true)

    try {
      await updateControl({
        id: editingControl.controlId,
        identifier: identificador,
        tag: editControl.etiqueta,
        correspondsToProcess: correspondeProceso,
        process: correspondeProceso ? editControl.proceso : undefined,
        subprocesses: correspondeProceso ? editControl.subprocesos : undefined,
        linkedProducts:
          correspondeProceso && editControl.etiqueta !== "Proceso de apoyo"
            ? editControl.productosVinculados
            : [],
        auditorId: editControl.auditorId || undefined,
      })
      await refresh()
      setEditingControl(null)
      setEditControl(initialNewControl)
    } catch (submitError) {
      setFormError(getErrorMessage(submitError, "No se pudo actualizar el control."))
    } finally {
      setIsSavingControl(false)
    }
  }

  const handleAddAuditor = async () => {
    if (!auditorToAdd) return

    setFormError(null)
    setIsAddingAuditor(true)

    try {
      await addLotAuditor(currentLote.id, auditorToAdd)
      await refresh()
      await onChanged?.()
      setAuditorToAdd("")
    } catch (submitError) {
      setFormError(getErrorMessage(submitError, "No se pudo agregar el auditor al lote."))
    } finally {
      setIsAddingAuditor(false)
    }
  }

  const getTotalControles = () => loteVerticales.reduce((acc, lv) => acc + lv.controles.length, 0)
  const getControlesTerminados = () => loteVerticales.reduce((acc, lv) => acc + lv.controles.filter((c) => c.estado === "terminado").length, 0)
  const getSubprocesosCount = (control: Control) => {
    if (control.subprocesos) return control.subprocesos.length
    if (!control.subproceso) return 0
    return control.subproceso.split(",").filter((subproceso) => subproceso.trim().length > 0).length
  }
  const getSubprocesosLabel = (control: Control) => {
    const subprocesos = control.subprocesos ?? control.subproceso?.split(",").map((subproceso) => subproceso.trim()).filter(Boolean) ?? []
    return subprocesos.join(", ")
  }
  const newControlIsProcess = isProcessTag(newControl.etiqueta)
  const editControlIsProcess = isProcessTag(editControl.etiqueta)
  const newControlIsBusinessUnit = isBusinessUnitTag(newControl.etiqueta)
  const editControlIsBusinessUnit = isBusinessUnitTag(editControl.etiqueta)
  const newControlBusinessUnitName = buildBusinessUnitControlName(newControl.unidadRecibeServicio, newControl.unidadPrestaServicio)
  const editControlBusinessUnitName = buildBusinessUnitControlName(editControl.unidadRecibeServicio, editControl.unidadPrestaServicio)
  const newControlValidationError = getControlValidationError(newControl)
  const editControlValidationError = getControlValidationError(editControl)

  return (
    <div className="space-y-6">
      {/* Header Info - Resumen de completado profesional */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-secondary/40 border border-border rounded-xl gap-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Modelo Aplicado</p>
          <h2 className="text-lg font-bold text-foreground">{modelo?.nombre}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="h-5 text-[10px] font-bold uppercase">{loteVerticales.length} Verticales</Badge>
            <Badge variant="outline" className="h-5 text-[10px] font-bold uppercase">Ciclo {lote.ciclo}</Badge>
          </div>
        </div>
        <div className="flex-1 max-w-[240px] sm:text-right space-y-1.5">
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Progreso General</p>
            {autoSaveStatus === 'saving' && <span className="text-[9px] text-muted-foreground flex items-center gap-1 animate-pulse"><Clock className="h-2.5 w-2.5" /> Guardando...</span>}
            {autoSaveStatus === 'saved' && <span className="text-[9px] text-success flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> Guardado</span>}
          </div>
          <Progress value={getTotalControles() > 0 ? (getControlesTerminados() / getTotalControles()) * 100 : 0} className="h-2" />
          <p className="text-sm font-bold">
            {getControlesTerminados()}/{getTotalControles()} <span className="text-muted-foreground font-normal">controles realizados</span>
          </p>
        </div>
      </div>

      {/* Auditores */}
      <div>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Equipo de Control de Calidad ({auditores.length})
          </h3>
          {canManageLots && <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Select value={auditorToAdd} onValueChange={setAuditorToAdd}>
              <SelectTrigger className="h-9 bg-secondary border-border sm:w-64">
                <SelectValue placeholder="Agregar analista o especialista" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {auditoresDisponibles.map((auditor) => (
                  <SelectItem key={auditor.id} value={auditor.id}>
                    {auditor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleAddAuditor}
              disabled={isAddingAuditor || !auditorToAdd}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isAddingAuditor ? "Agregando..." : "Agregar"}
            </Button>
          </div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {auditores.length > 0 ? (
            auditores.map((auditor) => (
              <div key={auditor.id} className="flex items-center gap-2 bg-background border border-border px-2 py-1.5 rounded-full shadow-none hover:border-primary/30 transition-colors">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <span className="text-primary text-[10px] font-bold uppercase">
                    {auditor.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <span className="text-xs font-medium pr-1">{auditor.name}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Este lote todavia no tiene analistas o especialistas asignados.</p>
          )}
        </div>
        {formError && <p className="mt-2 text-sm text-destructive">{formError}</p>}
      </div>

      {/* Verticales con sus Controles */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <FileCheck className="h-4 w-4" />
          Verticales y Controles
        </h3>

        <Accordion type="multiple" defaultValue={loteVerticales.map((lv) => lv.id)} className="space-y-3">
          {loteVerticales.map((loteVertical) => {
            const vertical = modelo?.verticales.find((v) => v.id === loteVertical.verticalId)
            if (!vertical) return null

            const controlesTerminados = loteVertical.controles.filter((c) => c.estado === "terminado").length
            const controlesTotal = loteVertical.controles.length

            return (
              <AccordionItem
                key={loteVertical.id}
                value={loteVertical.id}
                className="bg-card border border-border rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/50">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">
                          {vertical.peso}%
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{vertical.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {vertical.parametros.length} parámetros a evaluar
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Controles</p>
                        <p className="font-medium">{controlesTerminados}/{controlesTotal}</p>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {/* Lista de controles */}
                  <div className="space-y-2 mb-4">
                    {loteVertical.controles.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
                        <p>No hay controles agregados</p>
                        <p className="text-sm">Agrega controles para comenzar las evaluaciones</p>
                      </div>
                    ) : (
                      loteVertical.controles.map((control) => {
                        const auditor = data.users.find((u) => u.id === control.auditorId)
                        const subprocesosCount = control.correspondeProceso ? getSubprocesosCount(control) : 0
                        const subprocesosLabel = control.correspondeProceso ? getSubprocesosLabel(control) : ""
                        
                        return (
                          <div 
                            key={control.id} 
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/20 transition-all duration-200"
                          >
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-foreground">
                                  {control.identificador}
                                </span>
                                {control.etiqueta && (
                                  <Badge variant="outline" className="h-5 text-[10px] font-medium">
                                    {control.etiqueta}
                                  </Badge>
                                )}
                                <Badge className={cn("text-[10px] h-5 px-1.5 uppercase font-bold", getEstadoBadgeColor(control.estado))}>
                                  {formatEstado(control.estado)}
                                </Badge>
                                {subprocesosCount > 0 && (
                                  <Badge variant="outline" className="h-5 gap-1 border-primary/20 bg-primary/5 text-primary text-[10px] font-bold">
                                    <LayoutList className="h-2.5 w-2.5" />
                                    {subprocesosCount} Subprocesos
                                  </Badge>
                                )}
                              </div>
                              {subprocesosLabel && (
                                <p className="text-xs text-muted-foreground">{subprocesosLabel}</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-bold text-primary uppercase">
                                    {auditor ? auditor.name.split(" ").map((n) => n[0]).join("") : "-"}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground truncate max-w-[100px] hidden md:inline">
                                  {auditor ? auditor.name : "Sin analista o especialista"}
                                </span>
                              </div>

                              <div className="flex flex-col items-end min-w-[50px]">
                                <span className="text-[9px] text-muted-foreground uppercase font-bold">Logrado</span>
                                <span className={cn(
                                  "text-sm font-bold",
                                  control.scoreControl !== undefined ? getScoreColor(control.scoreControl) : "text-muted-foreground"
                                )}>
                                  {control.scoreControl ?? "--"}
                                </span>
                              </div>

                              <div className="flex justify-end">
                                {canManageControls && control.estado === "pendiente" && lote.estado === "abierto" ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openEditControl(loteVertical.id, control)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => handleDeleteControl(loteVertical.id, control.id)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Borrar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <div className="h-8 w-8" />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Botón para agregar control */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed"
                    disabled={!canManageControls || lote.estado !== "abierto"}
                    onClick={() => {
                      setNewControl(initialNewControl)
                      setIsControlSuggestionsOpen(false)
                      setIsProcessSuggestionsOpen(false)
                      setShowAddControl(loteVertical.id)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Control
                  </Button>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>

      {/* Dialogo para agregar control */}
      <Dialog
        open={showAddControl !== null}
        onOpenChange={() => {
          setIsControlSuggestionsOpen(false)
          setIsProcessSuggestionsOpen(false)
          setShowAddControl(null)
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] border-border bg-card sm:w-[90vw] lg:w-[70vw]">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Control</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="etiqueta-control">Etiqueta *</Label>
              <Select
                value={newControl.etiqueta}
                onValueChange={(value) => {
                  const etiqueta = value as NonNullable<Control["etiqueta"]>
                  const nextIsProcess = isProcessTag(etiqueta)
                  setNewControl({
                    ...newControl,
                    etiqueta,
                    correspondeProceso: nextIsProcess,
                    identificador: nextIsProcess ? newControl.proceso : etiqueta === "Unidad de Negocio" ? "" : newControl.identificador,
                    proceso: nextIsProcess ? newControl.proceso : "",
                    subprocesos: nextIsProcess ? newControl.subprocesos : [],
                    subprocesoTemp: nextIsProcess ? newControl.subprocesoTemp : "",
                    productosVinculados: etiqueta === "Proceso de apoyo" || !nextIsProcess ? [] : newControl.productosVinculados,
                    unidadPrestaServicio: etiqueta === "Unidad de Negocio" ? newControl.unidadPrestaServicio : "",
                    unidadRecibeServicio: etiqueta === "Unidad de Negocio" ? newControl.unidadRecibeServicio : "",
                  })
                }}
              >
                <SelectTrigger id="etiqueta-control" className="bg-secondary border-border">
                  <SelectValue placeholder="Seleccionar etiqueta" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {CONTROL_TAGS.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newControlIsBusinessUnit && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="unidad-recibe-servicio">Unidad de negocio que recibe el servicio *</Label>
                    <Select
                      value={newControl.unidadRecibeServicio}
                      onValueChange={(value) =>
                        setNewControl({
                          ...newControl,
                          unidadRecibeServicio: value,
                          identificador: buildBusinessUnitControlName(value, newControl.unidadPrestaServicio),
                        })
                      }
                    >
                      <SelectTrigger id="unidad-recibe-servicio" className="bg-secondary border-border">
                        <SelectValue placeholder="Seleccionar unidad" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {businessUnitOptions.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unidad-presta-servicio">Unidad de negocio que presta servicio *</Label>
                    <Select
                      value={newControl.unidadPrestaServicio}
                      onValueChange={(value) =>
                        setNewControl({
                          ...newControl,
                          unidadPrestaServicio: value,
                          identificador: buildBusinessUnitControlName(newControl.unidadRecibeServicio, value),
                        })
                      }
                    >
                      <SelectTrigger id="unidad-presta-servicio" className="bg-secondary border-border">
                        <SelectValue placeholder="Seleccionar unidad" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {businessUnitOptions.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nombre del Control</Label>
                  <Input value={newControlBusinessUnitName} readOnly placeholder="Se autocompleta al seleccionar las unidades" className="bg-secondary border-border" />
                </div>
              </>
            )}
            {!newControlIsProcess && !newControlIsBusinessUnit && (
            <div className="relative space-y-2">
              <Label htmlFor="identificador">Nombre del Control *</Label>
              <Input
                id="identificador"
                placeholder="Ej: Control de Inventario, Revisión de Facturas"
                value={newControl.identificador}
                onFocus={() => setIsControlSuggestionsOpen(true)}
                onBlur={() => window.setTimeout(() => setIsControlSuggestionsOpen(false), 120)}
                onChange={(e) => {
                  setNewControl({ ...newControl, identificador: e.target.value })
                  setIsControlSuggestionsOpen(true)
                }}
                className="bg-secondary border-border"
              />
              {isControlSuggestionsOpen && !newControlIsProcess && (
                <div
                  className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card p-1 shadow-none"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {filteredControlNames.length > 0 ? (
                    filteredControlNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className="flex w-full items-center rounded-sm px-3 py-2 text-left text-sm hover:bg-secondary"
                        onClick={() => {
                          setNewControl({ ...newControl, identificador: name })
                          setIsControlSuggestionsOpen(false)
                        }}
                      >
                        {name}
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      className="flex w-full items-center rounded-sm px-3 py-2 text-left text-sm text-primary hover:bg-secondary"
                      onClick={() => setIsControlSuggestionsOpen(false)}
                    >
                      Crear nuevo control{newControl.identificador.trim() ? `: ${newControl.identificador.trim()}` : ""}
                    </button>
                  )}
                  {newControl.identificador.trim() && filteredControlNames.length > 0 && !hasExactControlMatch && (
                    <button
                      type="button"
                      className="flex w-full items-center rounded-sm px-3 py-2 text-left text-sm text-primary hover:bg-secondary"
                      onClick={() => setIsControlSuggestionsOpen(false)}
                    >
                      Crear nuevo control: {newControl.identificador.trim()}
                    </button>
                  )}
                </div>
              )}
            </div>
            )}
            {!newControlIsProcess && (
            <div className="space-y-2">
                  <Label htmlFor="auditor">Analista o especialista de Control de Calidad *</Label>
              <Select
                value={newControl.auditorId}
                onValueChange={(value) => setNewControl({ ...newControl, auditorId: value })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Seleccionar analista o especialista" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {auditores.map((auditor) => (
                    <SelectItem key={auditor.id} value={auditor.id}>
                      {auditor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
            {newControlIsProcess && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="proceso">Nombre de proceso *</Label>
                  <div className="relative">
                    <Input
                      id="proceso"
                      placeholder="Ej: Ventas, Operaciones"
                      value={newControl.proceso}
                      onFocus={() => setIsProcessSuggestionsOpen(true)}
                      onBlur={() => window.setTimeout(() => setIsProcessSuggestionsOpen(false), 120)}
                      onChange={(e) => {
                        setNewControl({ ...newControl, proceso: e.target.value, identificador: e.target.value })
                        setIsProcessSuggestionsOpen(true)
                      }}
                      className="bg-secondary border-border"
                    />
                    {isProcessSuggestionsOpen && (
                      <div
                        className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card p-1 shadow-none"
                        onMouseDown={(event) => event.preventDefault()}
                      >
                        {filteredProcessNames.length > 0 ? (
                          filteredProcessNames.map((process) => (
                            <button
                              key={process}
                              type="button"
                              className="flex w-full items-center rounded-sm px-3 py-2 text-left text-sm hover:bg-secondary"
                              onClick={() => {
                                setNewControl({ ...newControl, proceso: process, identificador: process })
                                setIsProcessSuggestionsOpen(false)
                              }}
                            >
                              {process}
                            </button>
                          ))
                        ) : (
                          <button
                            type="button"
                            className="flex w-full items-center rounded-sm px-3 py-2 text-left text-sm text-primary hover:bg-secondary"
                            onClick={() => setIsProcessSuggestionsOpen(false)}
                          >
                            Crear nuevo proceso{newControl.proceso.trim() ? `: ${newControl.proceso.trim()}` : ""}
                          </button>
                        )}
                        {newControl.proceso.trim() && filteredProcessNames.length > 0 && !hasExactProcessMatch && (
                          <button
                            type="button"
                            className="flex w-full items-center rounded-sm px-3 py-2 text-left text-sm text-primary hover:bg-secondary"
                            onClick={() => setIsProcessSuggestionsOpen(false)}
                          >
                            Crear nuevo proceso: {newControl.proceso.trim()}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subproceso">Subprocesos *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="subproceso"
                      placeholder="Agregar subproceso"
                      value={newControl.subprocesoTemp}
                      onChange={(e) => setNewControl({ ...newControl, subprocesoTemp: e.target.value })}
                      className="bg-secondary border-border"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nextSub = newControl.subprocesoTemp.trim()
                        if (!nextSub) return
                        setNewControl({
                          ...newControl,
                          subprocesos: [...newControl.subprocesos, nextSub],
                          subprocesoTemp: "",
                        })
                      }}
                    >
                      Agregar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newControl.subprocesos.map((sub, index) => (
                      <span key={`${sub}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-border px-2 py-1 text-xs">
                        {sub}
                        <button
                          type="button"
                          onClick={() =>
                            setNewControl({
                              ...newControl,
                              subprocesos: newControl.subprocesos.filter((_, idx) => idx !== index),
                            })
                          }
                          className="text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                {newControl.etiqueta !== "Proceso de apoyo" && (
                  <div className="space-y-2">
                    <Label>Producto vinculado *</Label>
                    <div className="grid gap-2 rounded-lg border border-border bg-secondary/30 p-3 sm:grid-cols-2">
                      {productControls.length > 0 ? (
                        productControls.map((product) => (
                          <button
                            key={product}
                            type="button"
                            className={cn(
                              "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                              newControl.productosVinculados.includes(product)
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-foreground hover:border-primary/40",
                            )}
                            onClick={() =>
                              toggleLinkedProduct(newControl.productosVinculados, product, (nextProducts) =>
                                setNewControl({ ...newControl, productosVinculados: nextProducts }),
                              )
                            }
                          >
                            {product}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground sm:col-span-2">
                          No hay controles con etiqueta Producto en este lote.
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="auditor-proceso">Analista o especialista de Control de Calidad *</Label>
                  <Select
                    value={newControl.auditorId}
                    onValueChange={(value) => setNewControl({ ...newControl, auditorId: value })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Seleccionar analista o especialista" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {auditores.map((auditor) => (
                        <SelectItem key={auditor.id} value={auditor.id}>
                          {auditor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddControl(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => showAddControl && handleAddControl(showAddControl)}
              disabled={isSavingControl || Boolean(newControlValidationError)}
              className="bg-primary hover:bg-primary/90"
            >
              {isSavingControl ? "Guardando..." : "Agregar Control"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingControl !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingControl(null)
            setEditControl(initialNewControl)
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] border-border bg-card sm:w-[90vw] lg:w-[70vw]">
          <DialogHeader>
            <DialogTitle>Editar Control</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-etiqueta-control">Etiqueta *</Label>
              <Select
                value={editControl.etiqueta}
                onValueChange={(value) => {
                  const etiqueta = value as NonNullable<Control["etiqueta"]>
                  const nextIsProcess = isProcessTag(etiqueta)
                  setEditControl({
                    ...editControl,
                    etiqueta,
                    correspondeProceso: nextIsProcess,
                    identificador: nextIsProcess ? editControl.proceso || editControl.identificador : etiqueta === "Unidad de Negocio" ? "" : editControl.identificador,
                    proceso: nextIsProcess ? editControl.proceso || editControl.identificador : "",
                    subprocesos: nextIsProcess ? editControl.subprocesos : [],
                    subprocesoTemp: nextIsProcess ? editControl.subprocesoTemp : "",
                    productosVinculados: etiqueta === "Proceso de apoyo" || !nextIsProcess ? [] : editControl.productosVinculados,
                    unidadPrestaServicio: etiqueta === "Unidad de Negocio" ? editControl.unidadPrestaServicio : "",
                    unidadRecibeServicio: etiqueta === "Unidad de Negocio" ? editControl.unidadRecibeServicio : "",
                  })
                }}
              >
                <SelectTrigger id="edit-etiqueta-control" className="bg-secondary border-border">
                  <SelectValue placeholder="Seleccionar etiqueta" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {CONTROL_TAGS.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editControlIsBusinessUnit && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-unidad-recibe-servicio">Unidad de negocio que recibe el servicio *</Label>
                    <Select
                      value={editControl.unidadRecibeServicio}
                      onValueChange={(value) =>
                        setEditControl({
                          ...editControl,
                          unidadRecibeServicio: value,
                          identificador: buildBusinessUnitControlName(value, editControl.unidadPrestaServicio),
                        })
                      }
                    >
                      <SelectTrigger id="edit-unidad-recibe-servicio" className="bg-secondary border-border">
                        <SelectValue placeholder="Seleccionar unidad" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {businessUnitOptions.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-unidad-presta-servicio">Unidad de negocio que presta servicio *</Label>
                    <Select
                      value={editControl.unidadPrestaServicio}
                      onValueChange={(value) =>
                        setEditControl({
                          ...editControl,
                          unidadPrestaServicio: value,
                          identificador: buildBusinessUnitControlName(editControl.unidadRecibeServicio, value),
                        })
                      }
                    >
                      <SelectTrigger id="edit-unidad-presta-servicio" className="bg-secondary border-border">
                        <SelectValue placeholder="Seleccionar unidad" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {businessUnitOptions.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nombre del Control</Label>
                  <Input value={editControlBusinessUnitName} readOnly placeholder="Se autocompleta al seleccionar las unidades" className="bg-secondary border-border" />
                </div>
              </>
            )}
            {!editControlIsProcess && !editControlIsBusinessUnit && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-identificador">Nombre del Control *</Label>
                  <Input
                    id="edit-identificador"
                    value={editControl.identificador}
                    onChange={(event) => setEditControl({ ...editControl, identificador: event.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-auditor">Analista o especialista de Control de Calidad *</Label>
                  <Select
                    value={editControl.auditorId}
                    onValueChange={(value) => setEditControl({ ...editControl, auditorId: value })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Seleccionar analista o especialista" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {auditores.map((auditor) => (
                        <SelectItem key={auditor.id} value={auditor.id}>
                          {auditor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {editControlIsProcess && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-proceso">Nombre de proceso *</Label>
                  <Input
                    id="edit-proceso"
                    value={editControl.proceso}
                    onChange={(event) =>
                      setEditControl({ ...editControl, proceso: event.target.value, identificador: event.target.value })
                    }
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-subproceso">Subprocesos *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-subproceso"
                      placeholder="Agregar subproceso"
                      value={editControl.subprocesoTemp}
                      onChange={(event) => setEditControl({ ...editControl, subprocesoTemp: event.target.value })}
                      className="bg-secondary border-border"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nextSub = editControl.subprocesoTemp.trim()
                        if (!nextSub) return
                        setEditControl({
                          ...editControl,
                          subprocesos: [...editControl.subprocesos, nextSub],
                          subprocesoTemp: "",
                        })
                      }}
                    >
                      Agregar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editControl.subprocesos.map((sub, index) => (
                      <span key={`${sub}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-border px-2 py-1 text-xs">
                        {sub}
                        <button
                          type="button"
                          onClick={() =>
                            setEditControl({
                              ...editControl,
                              subprocesos: editControl.subprocesos.filter((_, idx) => idx !== index),
                            })
                          }
                          className="text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                {editControl.etiqueta !== "Proceso de apoyo" && (
                  <div className="space-y-2">
                    <Label>Producto vinculado *</Label>
                    <div className="grid gap-2 rounded-lg border border-border bg-secondary/30 p-3 sm:grid-cols-2">
                      {productControls.length > 0 ? (
                        productControls.map((product) => (
                          <button
                            key={product}
                            type="button"
                            className={cn(
                              "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                              editControl.productosVinculados.includes(product)
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-foreground hover:border-primary/40",
                            )}
                            onClick={() =>
                              toggleLinkedProduct(editControl.productosVinculados, product, (nextProducts) =>
                                setEditControl({ ...editControl, productosVinculados: nextProducts }),
                              )
                            }
                          >
                            {product}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground sm:col-span-2">
                          No hay controles con etiqueta Producto en este lote.
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="edit-auditor-proceso">Analista o especialista de Control de Calidad *</Label>
                  <Select
                    value={editControl.auditorId}
                    onValueChange={(value) => setEditControl({ ...editControl, auditorId: value })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Seleccionar analista o especialista" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {auditores.map((auditor) => (
                        <SelectItem key={auditor.id} value={auditor.id}>
                          {auditor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingControl(null)
                setEditControl(initialNewControl)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateControl}
              disabled={isSavingControl || Boolean(editControlValidationError)}
              className="bg-primary hover:bg-primary/90"
            >
              {isSavingControl ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

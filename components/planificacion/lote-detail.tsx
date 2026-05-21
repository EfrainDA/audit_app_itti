"use client"

import { useMemo, useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
  Play, 
  Pencil,
  Trash2, 
  ChevronRight, 
  FileCheck, 
  FileText, 
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
import { addLotAuditor, createControl, deleteControl, updateControl } from "@/lib/supabase-data"
import { getErrorMessage } from "@/lib/error-message"

interface LoteDetailProps {
  lote: Lote
  onChanged?: () => Promise<void> | void
}

export function LoteDetail({ lote, onChanged }: LoteDetailProps) {
  const { data, refresh } = useAppData()
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
    auditorId: "",
    correspondeProceso: false,
    proceso: "",
    subprocesos: [] as string[],
    subprocesoTemp: "",
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

  const existingControlNames = useMemo(() => {
    const loteIdsForUnidad = data.lotes
      .filter((unitLot) => unitLot.unidadNegocioId === lote.unidadNegocioId)
      .map((unitLot) => unitLot.id)

    const persistedNames = data.loteVerticales
      .filter((lv) => loteIdsForUnidad.includes(lv.loteId))
      .flatMap((lv) => lv.controles.map((control) => control.identificador))

    const localNames = loteVerticales.flatMap((lv) =>
      lv.controles.map((control) => control.identificador)
    )

    const names = [...persistedNames, ...localNames]
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }, [lote.unidadNegocioId, loteVerticales])

  const filteredControlNames = existingControlNames.filter((name) =>
    name.toLowerCase().includes(newControl.identificador.trim().toLowerCase())
  )
  const hasExactControlMatch = existingControlNames.some(
    (name) => name.toLowerCase() === newControl.identificador.trim().toLowerCase()
  )

  const existingProcessNames = useMemo(() => {
    const loteIdsForUnidad = data.lotes
      .filter((unitLot) => unitLot.unidadNegocioId === lote.unidadNegocioId)
      .map((unitLot) => unitLot.id)

    const persistedNames = data.loteVerticales
      .filter((lv) => loteIdsForUnidad.includes(lv.loteId))
      .flatMap((lv) =>
        lv.controles
          .map((control) => control.proceso || (control.correspondeProceso ? control.identificador : undefined))
          .filter((process): process is string => Boolean(process?.trim()))
      )

    const localNames = loteVerticales.flatMap((lv) =>
      lv.controles
        .map((control) => control.proceso || (control.correspondeProceso ? control.identificador : undefined))
        .filter((process): process is string => Boolean(process?.trim()))
    )

    return Array.from(new Set([...persistedNames, ...localNames])).sort((a, b) => a.localeCompare(b))
  }, [lote.unidadNegocioId, loteVerticales])

  const filteredProcessNames = existingProcessNames.filter((name) =>
    name.toLowerCase().includes(newControl.proceso.trim().toLowerCase())
  )
  const hasExactProcessMatch = existingProcessNames.some(
    (name) => name.toLowerCase() === newControl.proceso.trim().toLowerCase()
  )

  const handleAddControl = async (loteVerticalId: string) => {
    const identificador = newControl.correspondeProceso ? newControl.proceso.trim() : newControl.identificador.trim()
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
        correspondsToProcess: newControl.correspondeProceso,
        process: newControl.correspondeProceso ? newControl.proceso : undefined,
        subprocesses: newControl.correspondeProceso ? newControl.subprocesos : undefined,
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

    setEditingControl({ loteVerticalId, controlId: control.id })
    setEditControl({
      identificador: control.identificador,
      auditorId: control.auditorId || "",
      correspondeProceso: Boolean(control.correspondeProceso),
      proceso: control.correspondeProceso ? control.proceso || control.identificador : control.proceso || "",
      subprocesos,
      subprocesoTemp: "",
    })
  }

  const handleUpdateControl = async () => {
    if (!editingControl) return

    const identificador = editControl.correspondeProceso ? editControl.proceso.trim() : editControl.identificador.trim()
    if (!identificador) return

    setFormError(null)
    setIsSavingControl(true)

    try {
      await updateControl({
        id: editingControl.controlId,
        identifier: identificador,
        correspondsToProcess: editControl.correspondeProceso,
        process: editControl.correspondeProceso ? editControl.proceso : undefined,
        subprocesses: editControl.correspondeProceso ? editControl.subprocesos : undefined,
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Select value={auditorToAdd} onValueChange={setAuditorToAdd}>
              <SelectTrigger className="h-9 bg-secondary border-border sm:w-64">
                <SelectValue placeholder="Agregar auditor" />
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
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {auditores.length > 0 ? (
            auditores.map((auditor) => (
              <div key={auditor.id} className="flex items-center gap-2 bg-background border border-border px-2 py-1.5 rounded-full shadow-sm hover:border-primary/30 transition-colors">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <span className="text-primary text-[10px] font-bold uppercase">
                    {auditor.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <span className="text-xs font-medium pr-1">{auditor.name}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Este lote todavia no tiene auditores asignados.</p>
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
            const scorePromedio = loteVertical.controles.length > 0
              ? Math.round(
                  loteVertical.controles
                    .filter((c) => c.scoreControl !== undefined)
                    .reduce((acc, c) => acc + (c.scoreControl || 0), 0) /
                  (loteVertical.controles.filter((c) => c.scoreControl !== undefined).length || 1)
                )
              : null

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
                        <p className="text-xs text-accent">Peso asignado: {vertical.peso}%</p>
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
                      {scorePromedio !== null && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Puntaje Promedio</p>
                          <p className={`font-bold ${getScoreColor(scorePromedio)}`}>
                            {scorePromedio}
                          </p>
                        </div>
                      )}
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
                        const subprocesosCount = getSubprocesosCount(control)
                        
                        return (
                          <div 
                            key={control.id} 
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/20 transition-all duration-200"
                          >
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm font-semibold text-foreground">
                                  {control.identificador}
                                </span>
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
                              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                <FileText className="h-3 w-3 shrink-0" />
                                <span>{control.proceso || "Sin proceso específico"}</span>
                                {control.subproceso && <span className="text-border">|</span>}
                                <span className="truncate">{control.subproceso}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-bold text-primary uppercase">
                                    {auditor ? auditor.name.split(" ").map((n) => n[0]).join("") : "-"}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground truncate max-w-[100px] hidden md:inline">
                                  {auditor ? auditor.name : "Sin auditor"}
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
                                {control.estado === "pendiente" && lote.estado === "abierto" ? (
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
                  {lote.estado === "abierto" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed"
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
                  )}
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
        <DialogContent className="w-[70vw] max-w-[90vw] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Control</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/60 px-4 py-3">
              <div className="space-y-1">
                <Label htmlFor="correspondeProceso" className="text-sm font-medium">
                  Corresponde a Procesos
                </Label>
                <p className="text-xs text-muted-foreground">
                  Habilita la selección de proceso y la carga de subprocesos.
                </p>
              </div>
              <Switch
                id="correspondeProceso"
                checked={newControl.correspondeProceso}
                onCheckedChange={(checked) =>
                  setNewControl({
                    ...newControl,
                    correspondeProceso: checked,
                    identificador: checked ? newControl.proceso : newControl.identificador,
                    proceso: checked ? newControl.proceso : "",
                    subprocesos: checked ? newControl.subprocesos : [],
                    subprocesoTemp: checked ? newControl.subprocesoTemp : "",
                  })
                }
              />
            </div>
            {!newControl.correspondeProceso && (
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
              {isControlSuggestionsOpen && !newControl.correspondeProceso && (
                <div
                  className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg"
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
            {!newControl.correspondeProceso && (
            <div className="space-y-2">
              <Label htmlFor="auditor">Auditor</Label>
              <Select
                value={newControl.auditorId}
                onValueChange={(value) => setNewControl({ ...newControl, auditorId: value })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Seleccionar auditor" />
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
            {newControl.correspondeProceso && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="proceso">Proceso / Nombre del Control *</Label>
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
                        className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg"
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
                  <Label htmlFor="subproceso">Subprocesos</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="auditor-proceso">Auditor</Label>
                  <Select
                    value={newControl.auditorId}
                    onValueChange={(value) => setNewControl({ ...newControl, auditorId: value })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Seleccionar auditor" />
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
              disabled={isSavingControl || (newControl.correspondeProceso ? !newControl.proceso.trim() : !newControl.identificador.trim())}
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
        <DialogContent className="w-[70vw] max-w-[90vw] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Editar Control</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/60 px-4 py-3">
              <div className="space-y-1">
                <Label htmlFor="edit-correspondeProceso" className="text-sm font-medium">
                  Corresponde a Procesos
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cambia entre control simple o control asociado a proceso/subprocesos.
                </p>
              </div>
              <Switch
                id="edit-correspondeProceso"
                checked={editControl.correspondeProceso}
                onCheckedChange={(checked) =>
                  setEditControl({
                    ...editControl,
                    correspondeProceso: checked,
                    identificador: checked ? editControl.proceso || editControl.identificador : editControl.identificador,
                    proceso: checked ? editControl.proceso || editControl.identificador : "",
                    subprocesos: checked ? editControl.subprocesos : [],
                    subprocesoTemp: checked ? editControl.subprocesoTemp : "",
                  })
                }
              />
            </div>

            {!editControl.correspondeProceso && (
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
                  <Label htmlFor="edit-auditor">Auditor</Label>
                  <Select
                    value={editControl.auditorId}
                    onValueChange={(value) => setEditControl({ ...editControl, auditorId: value })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Seleccionar auditor" />
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

            {editControl.correspondeProceso && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-proceso">Proceso / Nombre del Control *</Label>
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
                  <Label htmlFor="edit-subproceso">Subprocesos</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="edit-auditor-proceso">Auditor</Label>
                  <Select
                    value={editControl.auditorId}
                    onValueChange={(value) => setEditControl({ ...editControl, auditorId: value })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Seleccionar auditor" />
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
              disabled={isSavingControl || (editControl.correspondeProceso ? !editControl.proceso.trim() : !editControl.identificador.trim())}
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

"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, User, Play, Trash2, ChevronRight, FileCheck } from "lucide-react"
import {
  type Lote,
  type Control,
  type LoteVertical,
  mockLoteVerticales,
  mockModelos,
  mockUsers,
  getEstadoBadgeColor,
  getScoreColor,
  formatEstado,
} from "@/lib/data"
import Link from "next/link"

interface LoteDetailProps {
  lote: Lote
}

export function LoteDetail({ lote }: LoteDetailProps) {
  const modelo = mockModelos.find((m) => m.id === lote.modeloControlId)
  const auditores = lote.auditores.map((id) => mockUsers.find((u) => u.id === id)).filter(Boolean)
  
  // Estado local para simular agregar controles
  const [loteVerticales, setLoteVerticales] = useState<LoteVertical[]>(() => {
    // Obtener verticales existentes del lote o crear nuevas basadas en el modelo
    const existentes = mockLoteVerticales.filter((lv) => lv.loteId === lote.id)
    
    // Crear verticales vacías basadas en el modelo
    return modelo?.verticales.map((v, idx) => ({
      id: existentes.find((lv) => lv.verticalId === v.id)?.id ?? `lv-new-${idx}`,
      loteId: lote.id,
      verticalId: v.id,
      controles: existentes.find((lv) => lv.verticalId === v.id)?.controles ?? []
    })) || []
  })

  const initialNewControl = {
    identificador: "",
    auditorId: "",
    proceso: "",
    subprocesos: [] as string[],
    subprocesoTemp: "",
  }

  const [showAddControl, setShowAddControl] = useState<string | null>(null)
  const [newControl, setNewControl] = useState(initialNewControl)

  const handleAddControl = (loteVerticalId: string) => {
    if (!newControl.identificador.trim()) return

    const nuevoControl: Control = {
      id: `c-${Date.now()}`,
      loteVerticalId,
      identificador: newControl.identificador,
      proceso: newControl.proceso || undefined,
      subproceso: newControl.subprocesos.length > 0 ? newControl.subprocesos.join(", ") : undefined,
      estado: "pendiente",
      fechaCreacion: new Date().toISOString().split("T")[0],
      auditorId: newControl.auditorId || undefined,
    }

    setLoteVerticales((prev) =>
      prev.map((lv) =>
        lv.id === loteVerticalId
          ? { ...lv, controles: [...lv.controles, nuevoControl] }
          : lv
      )
    )

    setNewControl({
      identificador: "",
      auditorId: "",
      proceso: "",
      subprocesos: [],
      subprocesoTemp: "",
    })
    setShowAddControl(null)
  }

  const handleDeleteControl = (loteVerticalId: string, controlId: string) => {
    setLoteVerticales((prev) =>
      prev.map((lv) =>
        lv.id === loteVerticalId
          ? { ...lv, controles: lv.controles.filter((c) => c.id !== controlId) }
          : lv
      )
    )
  }

  const selectedVertical = showAddControl
    ? modelo?.verticales.find((v) => v.id === loteVerticales.find((lv) => lv.id === showAddControl)?.verticalId)
    : undefined

  const getTotalControles = () => loteVerticales.reduce((acc, lv) => acc + lv.controles.length, 0)
  const getControlesTerminados = () => loteVerticales.reduce((acc, lv) => acc + lv.controles.filter((c) => c.estado === "terminado").length, 0)

  return (
    <div className="space-y-6">
      {/* Header con info del modelo */}
      <div className="flex items-start justify-between p-4 bg-secondary rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Modelo de Control</p>
          <p className="font-medium">{modelo?.nombre}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {modelo?.verticales.length} verticales configuradas
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Controles</p>
          <p className="text-2xl font-bold">
            {getControlesTerminados()}/{getTotalControles()}
          </p>
        </div>
      </div>

      {/* Auditores */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <User className="h-4 w-4" />
          Auditores Asignados ({auditores.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {auditores.map((auditor) => (
            <div key={auditor?.id} className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-xs font-medium">
                  {auditor?.name.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{auditor?.name}</p>
                <p className="text-xs text-muted-foreground">{auditor?.email}</p>
              </div>
            </div>
          ))}
        </div>
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
                        const auditor = mockUsers.find((u) => u.id === control.auditorId)
                        return (
                          <Card key={control.id} className="bg-secondary border-border">
                            <CardContent className="p-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col">
                                    <span className="font-mono text-sm font-medium">
                                      {control.identificador}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {control.proceso}
                                      {control.subproceso && ` / ${control.subproceso}`}
                                    </span>
                                  </div>
                                </div>
                                <div className="grid w-full grid-cols-4 items-center gap-3 text-sm sm:w-auto">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                      {auditor ? auditor.name.split(" ").map((n) => n[0]).join("") : "-"}
                                    </div>
                                    <span className="truncate">
                                      {auditor ? auditor.name : "Sin auditor"}
                                    </span>
                                  </div>
                                  <div>
                                    <Badge className={getEstadoBadgeColor(control.estado)}>
                                      {formatEstado(control.estado)}
                                    </Badge>
                                  </div>
                                  <div className="text-right font-medium">
                                    {control.scoreControl !== undefined ? (
                                      <span className={`font-bold ${getScoreColor(control.scoreControl)}`}>
                                        {control.scoreControl}
                                      </span>
                                    ) : (
                                      "-"
                                    )}
                                  </div>
                                  <div className="flex justify-end">
                                    {control.estado === "pendiente" && lote.estado === "abierto" ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteControl(loteVertical.id, control.id)}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                      <div className="h-8 w-8" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
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
      <Dialog open={showAddControl !== null} onOpenChange={() => setShowAddControl(null)}>
        <DialogContent className="w-[70vw] max-w-[90vw] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Control</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="identificador">Nombre del Control *</Label>
              <Input
                id="identificador"
                placeholder="Ej: Control de Inventario, Revisión de Facturas"
                value={newControl.identificador}
                onChange={(e) => setNewControl({ ...newControl, identificador: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
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
            {selectedVertical?.contieneProceso && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="proceso">Proceso</Label>
                  <Select
                    value={newControl.proceso}
                    onValueChange={(value) => setNewControl({ ...newControl, proceso: value })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Seleccionar proceso" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="Ventas">Ventas</SelectItem>
                      <SelectItem value="Soporte">Soporte</SelectItem>
                      <SelectItem value="Operaciones">Operaciones</SelectItem>
                      <SelectItem value="Compras">Compras</SelectItem>
                      <SelectItem value="Logística">Logística</SelectItem>
                      <SelectItem value="RRHH">RRHH</SelectItem>
                    </SelectContent>
                  </Select>
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
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddControl(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => showAddControl && handleAddControl(showAddControl)}
              disabled={!newControl.identificador.trim() || (selectedVertical?.contieneProceso && !newControl.proceso.trim())}
              className="bg-primary hover:bg-primary/90"
            >
              Agregar Control
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

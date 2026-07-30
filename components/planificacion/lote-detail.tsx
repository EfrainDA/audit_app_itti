"use client"

/* eslint-disable @typescript-eslint/no-unused-vars */

// Detalle del lote: equipo auditor, verticales y controles planificados.
import { useMemo, useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
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
  LayoutList 
} from "lucide-react"
import {
  type Lote,
  type Control,
  type LoteVertical,
  getControlDisplayEstado,
} from "@/lib/data"
import { cn } from "@/lib/utils"
import { useAppData } from "@/hooks/use-app-data"
import { useAuth } from "@/components/auth/auth-provider"
import { addLotAuditor, createControl, deleteControl, updateControl } from "@/lib/repositories/supabase/planning"
import { getErrorMessage } from "@/lib/error-message"
import { canEditAssignedControl, canManageControls as roleCanManageControls, isManager } from "@/lib/domain/permissions"
import { ConfirmDestructiveDialog } from "@/components/ui/confirm-destructive-dialog"
import {
  buildBusinessUnitControlName,
  CONTROL_TAGS,
  isBusinessUnitTag,
  isProcessTag,
  splitBusinessUnitControlName,
  createEmptyControlDraft,
  getControlDraftError,
  toggleListValue,
} from "@/features/planning/domain/control-naming"

interface LoteDetailProps {
  lote: Lote
  onChanged?: () => Promise<void> | void
}

// Mantiene formularios, permisos y mutaciones del lote seleccionado.
import { useLoteDetailController } from "./use-lote-detail-controller"
import { LoteControlDialogs } from "./lote-control-dialogs"
export function LoteDetail({ lote, onChanged }: LoteDetailProps) {
  const controller = useLoteDetailController({ lote, onChanged })
  if (!("data" in controller)) return controller
  const { data, refresh, appUser, canManageLots, canManageControls, currentLote, modelo, auditores, auditoresDisponibles, loteVerticales, setLoteVerticales, initialNewControl, showAddControl, setShowAddControl, newControl, setNewControl, editingControl, setEditingControl, editControl, setEditControl, isControlSuggestionsOpen, setIsControlSuggestionsOpen, formError, setFormError, actionSuccess, setActionSuccess, controlToDelete, setControlToDelete, isSavingControl, setIsSavingControl, auditorToAdd, setAuditorToAdd, isAddingAuditor, setIsAddingAuditor, controlsForCurrentUnit, existingControlNames, filteredControlNames, hasExactControlMatch, existingProcessNames, productControls, businessUnitOptions, toggleLinkedProduct, handleAddControl, openEditControl, handleUpdateControl, handleAddAuditor, answeredControlIds, getSubprocesosCount, getSubprocesosLabel, newControlIsProcess, editControlIsProcess, newControlIsBusinessUnit, editControlIsBusinessUnit, newControlBusinessUnitName, editControlBusinessUnitName, newControlValidationError, editControlValidationError } = controller
return (
    <div className="space-y-6">
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
                  <span className="text-primary text-xs font-bold uppercase">
                    {auditor.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <span className="text-xs font-medium pr-1">{auditor.name}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Este lote todavía no tiene analistas o especialistas asignados.</p>
          )}
        </div>
        {formError && <p className="mt-2 text-sm text-status-danger-text">{formError}</p>}
      </div>

      {/* Verticales con sus Controles */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileCheck className="h-4 w-4 text-primary" />
            Verticales y controles
          </h3>
          <p className="text-xs text-muted-foreground">
            Cada vertical agrupa sus controles asociados. Los controles se muestran como filas simples para mantener el foco en lo importante.
          </p>
        </div>

        <div className="space-y-5">
          {loteVerticales.map((loteVertical) => {
            const vertical = modelo?.verticales.find((v) => v.id === loteVertical.verticalId)
            if (!vertical) return null

            const controlesTerminados = loteVertical.controles.filter((c) => c.estado === "terminado").length
            const controlesTotal = loteVertical.controles.length
            const progressWidth = controlesTotal > 0 ? (controlesTerminados / controlesTotal) * 100 : 0

            return (
              <section
                key={loteVertical.id}
                className="overflow-hidden rounded-lg border border-border/70 bg-card"
              >
                <div className="border-b border-border/60 px-4 py-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-semibold text-primary">
                          {vertical.peso}%
                        </span>
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-semibold">{vertical.nombre}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {vertical.parametros.length} parámetros a evaluar
                        </p>
                      </div>
                    </div>
                    <div className="w-full shrink-0 md:w-44">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Avance</span>
                        <span className="font-semibold text-foreground">{controlesTerminados}/{controlesTotal}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressWidth}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="relative mb-3 pl-5">
                    <div className="absolute bottom-1 left-1.5 top-1 w-px bg-border" />
                    {loteVertical.controles.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border/80 bg-secondary/20 px-4 py-5 text-center text-muted-foreground">
                        <p className="text-sm font-medium text-foreground">Sin controles agregados</p>
                        <p className="text-xs">Agrega controles para comenzar las evaluaciones.</p>
                      </div>
                    ) : (
                      loteVertical.controles.map((control) => {
                        const auditor = data.users.find((u) => u.id === control.auditorId)
                        const subprocesosCount = control.correspondeProceso ? getSubprocesosCount(control) : 0
                        const subprocesosLabel = control.correspondeProceso ? getSubprocesosLabel(control) : ""
                        const displayEstado = getControlDisplayEstado(control, answeredControlIds)
                        const isFinishedControl = displayEstado === "terminado"
                        const canManageThisControl =
                          lote.estado === "abierto" &&
                          !isFinishedControl &&
                          canEditAssignedControl(appUser?.role, appUser?.id, control.auditorId)
                        
                        return (
                          <div
                            key={control.id}
                            className="group relative flex flex-col gap-2 rounded-md px-3 py-2.5 transition-colors hover:bg-secondary/35 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span className="absolute -left-[1.05rem] top-4 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary/70" />
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
                                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                                  {control.identificador}
                                </span>
                                {control.etiqueta && (
                                  <Badge variant="outline" className="h-5 rounded-full border-border/80 bg-background text-xs font-medium text-muted-foreground">
                                    {control.etiqueta}
                                  </Badge>
                                )}
                                {subprocesosCount > 0 && (
                                  <Badge variant="outline" className="h-5 gap-1 rounded-full border-primary/20 bg-primary/5 text-xs font-semibold text-primary">
                                    <LayoutList className="h-2.5 w-2.5" />
                                    {subprocesosCount} subprocesos
                                  </Badge>
                                )}
                              </div>
                              {subprocesosLabel && (
                                <p className="line-clamp-1 text-xs text-muted-foreground">{subprocesosLabel}</p>
                              )}
                            </div>

                            <div className="flex min-w-0 items-center gap-2 sm:w-52">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                                <span className="text-xs font-bold uppercase text-muted-foreground">
                                  {auditor ? auditor.name.split(" ").map((n) => n[0]).join("") : "-"}
                                </span>
                              </div>
                              <span className="min-w-0 truncate text-xs text-muted-foreground">
                                {auditor ? auditor.name : "Sin analista"}
                              </span>
                            </div>

                            <div className="flex justify-end sm:w-8">
                              {canManageControls && canManageThisControl ? (
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
                                    {canManageLots && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-status-danger-text"
                                          onClick={() => {
                                            setActionSuccess(null)
                                            setControlToDelete(control)
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Borrar
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <div className="h-8 w-8" />
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Acción disponible únicamente para quienes pueden administrar el lote. */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-5 h-8 border-dashed bg-background px-3 text-xs"
                    disabled={!canManageControls || lote.estado !== "abierto"}
                    onClick={() => {
                      setNewControl(initialNewControl)
                      setIsControlSuggestionsOpen(false)
                      setShowAddControl(loteVertical.id)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar control
                  </Button>
                </div>
              </section>
            )
          })}
        </div>
      </section>

      {actionSuccess && (
        <p role="status" className="rounded-md border border-status-success-border bg-status-success-surface px-3 py-2 text-sm text-status-success-text">
          {actionSuccess}
        </p>
      )}

      <ConfirmDestructiveDialog
        open={Boolean(controlToDelete)}
        onOpenChange={(next) => {
          if (!next) setControlToDelete(null)
        }}
        title="Eliminar control"
        description={`Se eliminará el control “${controlToDelete?.identificador ?? ""}”. Esta acción no se puede deshacer.`}
        errorMessage="No se pudo eliminar el control."
        onConfirm={async () => {
          if (!controlToDelete) return
          const identifier = controlToDelete.identificador
          await deleteControl(controlToDelete.id)
          await refresh()
          await onChanged?.()
          setActionSuccess(`El control “${identifier}” fue eliminado.`)
        }}
      />

      {/* Dialogo para agregar control */}
      <LoteControlDialogs controller={controller} />

    </div>
  )
}

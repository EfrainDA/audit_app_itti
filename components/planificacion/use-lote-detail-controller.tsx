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
import { canManageControls as roleCanManageControls, isManager } from "@/lib/domain/permissions"
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
export function useLoteDetailController({ lote, onChanged }: LoteDetailProps) {
  const { data, refresh } = useAppData({
    domains: ["users", "settings", "models", "planning", "evaluations"],
    scope: { lotId: lote.id },
  })
  const { appUser } = useAuth()
  const canManageLots = isManager(appUser?.role)
  const canManageControls = roleCanManageControls(appUser?.role)
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
    ...createEmptyControlDraft(),
    auditorId: appUser?.role === "auditor" ? appUser.id : "",
  }
  const activeCatalogItems = useMemo(
    () => data.catalogItems.filter((item) => item.estado === "activo"),
    [data.catalogItems],
  )

  const [showAddControl, setShowAddControl] = useState<string | null>(null)
  const [newControl, setNewControl] = useState(initialNewControl)
  const [editingControl, setEditingControl] = useState<{ loteVerticalId: string; controlId: string } | null>(null)
  const [editControl, setEditControl] = useState(initialNewControl)
  const [isControlSuggestionsOpen, setIsControlSuggestionsOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [controlToDelete, setControlToDelete] = useState<Control | null>(null)
  const [isSavingControl, setIsSavingControl] = useState(false)
  const [auditorToAdd, setAuditorToAdd] = useState("")
  const [isAddingAuditor, setIsAddingAuditor] = useState(false)

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

  const productControls = useMemo(
    () => activeCatalogItems
      .filter((item) => item.categoria === "producto")
      .map((item) => item.nombre)
      .sort((first, second) => first.localeCompare(second)),
    [activeCatalogItems],
  )
  const businessUnitOptions = data.unidades.map((unit) => unit.nombre).sort((a, b) => a.localeCompare(b))

  const toggleLinkedProduct = (
    current: string[],
    product: string,
    onChange: (nextProducts: string[]) => void,
  ) => {
    onChange(toggleListValue(current, product))
  }

  const handleAddControl = async (loteVerticalId: string) => {
    const validationError = getControlDraftError(newControl)
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
        catalogItemId: newControl.catalogItemId,
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
      setShowAddControl(null)
    } catch (submitError) {
      setFormError(getErrorMessage(submitError, "No se pudo guardar el control."))
    } finally {
      setIsSavingControl(false)
    }
  }

  const openEditControl = (loteVerticalId: string, control: Control) => {
    const subprocesos = control.subprocesos ?? control.subproceso?.split(",").map((subproceso) => subproceso.trim()).filter(Boolean) ?? []
    const controlIsProcess = isProcessTag(control.etiqueta) || Boolean(control.correspondeProceso)
    const businessUnits = isBusinessUnitTag(control.etiqueta) ? splitBusinessUnitControlName(control.identificador) : { recibe: "", presta: "" }

    const normalizedTag = control.etiqueta === "Proceso de apoyo" ? "Proceso" : control.etiqueta ?? "Unidad de Negocio"
    const category = normalizedTag === "Producto"
      ? "producto"
      : normalizedTag === "Proceso"
        ? "proceso"
        : normalizedTag === "Otro"
          ? "otro"
          : normalizedTag === "Área transversal"
            ? "area_transversal"
          : null
    const catalogMatch = data.catalogItems.find((item) =>
      item.id === control.catalogItemId
      || (
        category === item.categoria
        && item.nombre.localeCompare(control.proceso || control.producto || control.identificador, undefined, { sensitivity: "accent" }) === 0
      ),
    )

    setEditingControl({ loteVerticalId, controlId: control.id })
    setEditControl({
      identificador: control.identificador,
      etiqueta: normalizedTag,
      catalogItemId: catalogMatch?.id ?? "",
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
    const validationError = getControlDraftError(editControl)
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
        catalogItemId: editControl.catalogItemId,
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

  const answeredControlIds = useMemo(() => new Set(data.respuestas.map((answer) => answer.controlId)), [data.respuestas])
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
  const newControlValidationError = getControlDraftError(newControl)
  const editControlValidationError = getControlDraftError(editControl)

    return { lote, onChanged, data, refresh, appUser, canManageLots, canManageControls, currentLote, modelo, auditores, auditoresDisponibles, loteVerticales, setLoteVerticales, initialNewControl, showAddControl, setShowAddControl, newControl, setNewControl, editingControl, setEditingControl, editControl, setEditControl, isControlSuggestionsOpen, setIsControlSuggestionsOpen, formError, setFormError, actionSuccess, setActionSuccess, controlToDelete, setControlToDelete, isSavingControl, setIsSavingControl, auditorToAdd, setAuditorToAdd, isAddingAuditor, setIsAddingAuditor, controlsForCurrentUnit, existingControlNames, filteredControlNames, hasExactControlMatch, existingProcessNames, activeCatalogItems, productControls, businessUnitOptions, toggleLinkedProduct, handleAddControl, openEditControl, handleUpdateControl, handleAddAuditor, answeredControlIds, getSubprocesosCount, getSubprocesosLabel, newControlIsProcess, editControlIsProcess, newControlIsBusinessUnit, editControlIsBusinessUnit, newControlBusinessUnitName, editControlBusinessUnitName, newControlValidationError, editControlValidationError }
}

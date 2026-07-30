"use client"

// Diálogos del detalle de lote. Reutilizan el mismo controlador para que altas
// y ediciones respeten idénticas validaciones y permisos.
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import type { useLoteDetailController } from "./use-lote-detail-controller"
import { CatalogControlFields } from "./catalog-control-fields"

type ReadyController = Extract<ReturnType<typeof useLoteDetailController>, { data: unknown }>

export function LoteControlDialogs({ controller }: { controller: ReadyController }) {
  const {
    data,
    canManageLots,
    currentLote,
    auditores,
    initialNewControl,
    showAddControl,
    setShowAddControl,
    newControl,
    setNewControl,
    editingControl,
    setEditingControl,
    editControl,
    setEditControl,
    formError,
    isSavingControl,
    businessUnitOptions,
    handleAddControl,
    handleUpdateControl,
    newControlValidationError,
    editControlValidationError,
  } = controller
  return (<>
      <Dialog
        open={showAddControl !== null}
        onOpenChange={(open) => {
          if (!open) setShowAddControl(null)
        }}
      >
        <DialogContent className="!w-[min(calc(100vw-2rem),42rem)] !max-w-[42rem] border-border bg-card">
          <DialogHeader>
            <DialogTitle>Agregar Control</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <CatalogControlFields
              idPrefix="new-control"
              draft={newControl}
              onChange={setNewControl}
              catalogItems={data.catalogItems}
              auditors={auditores}
              auditorSelectionDisabled={!canManageLots}
              businessUnitOptions={businessUnitOptions}
              businessUnitId={currentLote.unidadNegocioId}
            />
          </div>
          {formError && <p className="text-sm text-status-danger-text">{formError}</p>}
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
          <div className="py-4">
            <CatalogControlFields
              idPrefix="edit-control"
              draft={editControl}
              onChange={setEditControl}
              catalogItems={data.catalogItems}
              auditors={auditores}
              auditorSelectionDisabled={!canManageLots}
              businessUnitOptions={businessUnitOptions}
              businessUnitId={currentLote.unidadNegocioId}
            />
          </div>
          {formError && <p className="text-sm text-status-danger-text">{formError}</p>}
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
  </>)
}

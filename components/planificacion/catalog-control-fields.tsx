"use client"

// Campos compartidos por las altas y ediciones de controles. Restringe las
// opciones al catálogo y a la unidad de negocio del lote seleccionado.
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Control, CatalogItem, User } from "@/lib/data"
import {
  buildBusinessUnitControlName,
  CONTROL_TAGS,
  type ControlDraft,
  isBusinessUnitTag,
  isProcessTag,
} from "@/features/planning/domain/control-naming"

const categoryByTag = {
  Producto: "producto",
  Proceso: "proceso",
  Otro: "otro",
  "Área transversal": "area_transversal",
} as const

const catalogLabelByTag = {
  Producto: "Producto o servicio",
  Proceso: "Proceso",
  Otro: "Otro control",
  "Área transversal": "Área transversal",
} as const

export function CatalogControlFields({
  idPrefix,
  draft,
  onChange,
  catalogItems,
  auditors,
  auditorSelectionDisabled = false,
  businessUnitOptions,
  businessUnitId,
}: {
  idPrefix: string
  draft: ControlDraft
  onChange: (next: ControlDraft) => void
  catalogItems: CatalogItem[]
  auditors: User[]
  auditorSelectionDisabled?: boolean
  businessUnitOptions: string[]
  businessUnitId: string
}) {
  const isBusinessUnit = isBusinessUnitTag(draft.etiqueta)
  const isProcess = isProcessTag(draft.etiqueta)
  const category = draft.etiqueta in categoryByTag
    ? categoryByTag[draft.etiqueta as keyof typeof categoryByTag]
    : null
  const availableItems = category
    ? catalogItems
      .filter((item) =>
        item.categoria === category
        && (item.categoria === "area_transversal" || item.unidadNegocioId === businessUnitId)
        && (item.estado === "activo" || item.id === draft.catalogItemId),
      )
      .sort((first, second) => first.nombre.localeCompare(second.nombre))
    : []
  const selectedItem = catalogItems.find((item) => item.id === draft.catalogItemId)
  const linkedProducts = (selectedItem?.productosVinculadosIds ?? [])
    .map((productId) => catalogItems.find((item) => item.id === productId))
    .filter((item): item is CatalogItem => Boolean(item))
  const typeOptions = isBusinessUnit ? [...CONTROL_TAGS, "Unidad de Negocio" as const] : CONTROL_TAGS

  const changeType = (tag: NonNullable<Control["etiqueta"]>) => {
    const nextIsProcess = isProcessTag(tag)
    onChange({
      ...draft,
      etiqueta: tag,
      catalogItemId: "",
      identificador: "",
      correspondeProceso: nextIsProcess,
      proceso: "",
      subprocesos: [],
      subprocesoTemp: "",
      productosVinculados: [],
      unidadPrestaServicio: tag === "Unidad de Negocio" ? draft.unidadPrestaServicio : "",
      unidadRecibeServicio: tag === "Unidad de Negocio" ? draft.unidadRecibeServicio : "",
    })
  }

  const selectCatalogItem = (itemId: string) => {
    const item = catalogItems.find((catalogItem) => catalogItem.id === itemId)
    if (!item) return
    onChange({
      ...draft,
      catalogItemId: item.id,
      identificador: item.nombre,
      proceso: item.categoria === "proceso" ? item.nombre : "",
      subprocesos: item.categoria === "proceso" ? item.subprocesos : [],
      subprocesoTemp: "",
      productosVinculados: item.categoria === "proceso"
        ? item.productosVinculadosIds
          .map((productId) => catalogItems.find((product) => product.id === productId)?.nombre)
          .filter((name): name is string => Boolean(name))
        : [],
      correspondeProceso: item.categoria === "proceso",
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-type`}>Tipo de control *</Label>
        <Select value={draft.etiqueta} onValueChange={(value) => changeType(value as NonNullable<Control["etiqueta"]>)}>
          <SelectTrigger id={`${idPrefix}-type`}>
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          La selección utiliza los registros administrados en Ajustes para evitar duplicados.
        </p>
      </div>

      {isBusinessUnit ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-receiving-unit`}>Unidad que recibe el servicio *</Label>
              <Select
                value={draft.unidadRecibeServicio}
                onValueChange={(value) => onChange({
                  ...draft,
                  unidadRecibeServicio: value,
                  identificador: buildBusinessUnitControlName(value, draft.unidadPrestaServicio),
                })}
              >
                <SelectTrigger id={`${idPrefix}-receiving-unit`}><SelectValue placeholder="Seleccionar unidad" /></SelectTrigger>
                <SelectContent>
                  {businessUnitOptions.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-provider-unit`}>Unidad que presta el servicio *</Label>
              <Select
                value={draft.unidadPrestaServicio}
                onValueChange={(value) => onChange({
                  ...draft,
                  unidadPrestaServicio: value,
                  identificador: buildBusinessUnitControlName(draft.unidadRecibeServicio, value),
                })}
              >
                <SelectTrigger id={`${idPrefix}-provider-unit`}><SelectValue placeholder="Seleccionar unidad" /></SelectTrigger>
                <SelectContent>
                  {businessUnitOptions.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nombre del control</Label>
            <Input value={draft.identificador} readOnly placeholder="Se completa al seleccionar las unidades" />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${idPrefix}-catalog-item`}>
                {draft.etiqueta in catalogLabelByTag
                  ? catalogLabelByTag[draft.etiqueta as keyof typeof catalogLabelByTag]
                  : "Registro del catálogo"} *
              </Label>
              <Button asChild variant="link" size="sm" className="h-auto px-0 py-0 text-xs">
                <Link href="/ajustes/catalogos">Administrar catálogo</Link>
              </Button>
            </div>
            <Select value={draft.catalogItemId} onValueChange={selectCatalogItem}>
              <SelectTrigger id={`${idPrefix}-catalog-item`}>
                <SelectValue placeholder={`Seleccionar ${catalogLabelByTag[draft.etiqueta as keyof typeof catalogLabelByTag]?.toLocaleLowerCase() ?? "registro"}`} />
              </SelectTrigger>
              <SelectContent>
                {availableItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nombre}{item.estado === "inactivo" ? " (inactivo)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableItems.length === 0 && (
              <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                No hay registros activos de este tipo. Agrégalos primero desde Ajustes → Catálogos.
              </p>
            )}
            {selectedItem?.descripcion && (
              <p className="text-xs text-muted-foreground">{selectedItem.descripcion}</p>
            )}
          </div>

          {isProcess && selectedItem && (
            <div className="space-y-2">
              <Label>Subprocesos o procedimientos</Label>
              <div className="flex min-h-11 flex-wrap gap-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                {draft.subprocesos.map((subprocess) => (
                  <Badge key={subprocess} variant="outline" className="bg-background font-normal">{subprocess}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Estos datos provienen del proceso seleccionado.</p>
            </div>
          )}

          {isProcess && (
            <div className="space-y-2">
              <Label>Productos vinculados</Label>
              <div className="flex min-h-11 items-center rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                {linkedProducts.length > 0
                  ? (
                      <div className="flex flex-wrap gap-2">
                        {linkedProducts.map((product) => (
                          <Badge key={product.id} variant="outline" className="bg-background font-normal">{product.nombre}</Badge>
                        ))}
                      </div>
                    )
                  : <span className="text-sm text-muted-foreground">No aplica para este proceso.</span>}
              </div>
            </div>
          )}
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-auditor`}>Analista o especialista de Control de Calidad *</Label>
        <Select
          value={draft.auditorId}
          onValueChange={(value) => onChange({ ...draft, auditorId: value })}
          disabled={auditorSelectionDisabled}
        >
          <SelectTrigger id={`${idPrefix}-auditor`}><SelectValue placeholder="Seleccionar analista o especialista" /></SelectTrigger>
          <SelectContent>
            {auditors.map((auditor) => <SelectItem key={auditor.id} value={auditor.id}>{auditor.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {auditorSelectionDisabled && (
          <p className="text-xs text-muted-foreground">
            La asignación solo puede ser modificada por un supervisor o administrador.
          </p>
        )}
      </div>
    </div>
  )
}

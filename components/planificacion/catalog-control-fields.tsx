"use client"

// Campos compartidos por las altas y ediciones de controles. Restringe las
// opciones al catálogo y a la unidad de negocio del lote seleccionado.
import { Check, Search } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

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
import {
  buildBusinessUnitControlName,
  CONTROL_TAGS,
  type ControlDraft,
  isBusinessUnitTag,
  isProcessTag,
} from "@/features/planning/domain/control-naming"
import type { CatalogItem, Control, User } from "@/lib/data"

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
  const [catalogSearch, setCatalogSearch] = useState("")
  const [isCatalogSearchOpen, setIsCatalogSearchOpen] = useState(false)
  const isBusinessUnit = isBusinessUnitTag(draft.etiqueta)
  const isProcess = isProcessTag(draft.etiqueta)
  const category = draft.etiqueta in categoryByTag
    ? categoryByTag[draft.etiqueta as keyof typeof categoryByTag]
    : null
  const availableItems = useMemo(
    () => category
      ? catalogItems
        .filter((item) =>
          item.categoria === category
          && (item.categoria === "area_transversal" || item.unidadNegocioId === businessUnitId)
          && (item.estado === "activo" || item.id === draft.catalogItemId),
        )
        .sort((first, second) => first.nombre.localeCompare(second.nombre))
      : [],
    [businessUnitId, catalogItems, category, draft.catalogItemId],
  )
  const selectedItem = catalogItems.find((item) => item.id === draft.catalogItemId)
  const normalizedCatalogSearch = catalogSearch
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase()
  const filteredAvailableItems = useMemo(
    () => normalizedCatalogSearch
      ? availableItems.filter((item) =>
          `${item.nombre} ${item.descripcion ?? ""}`
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase()
            .includes(normalizedCatalogSearch),
        )
      : availableItems,
    [availableItems, normalizedCatalogSearch],
  )
  const linkedProducts = (selectedItem?.productosVinculadosIds ?? [])
    .map((productId) => catalogItems.find((item) => item.id === productId))
    .filter((item): item is CatalogItem => Boolean(item))
  const typeOptions = isBusinessUnit ? [...CONTROL_TAGS, "Unidad de Negocio" as const] : CONTROL_TAGS

  useEffect(() => {
    setCatalogSearch(selectedItem?.nombre ?? "")
  }, [draft.etiqueta, selectedItem?.id, selectedItem?.nombre])

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
    setCatalogSearch(item.nombre)
    setIsCatalogSearchOpen(false)
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

  const changeCatalogSearch = (value: string) => {
    setCatalogSearch(value)
    setIsCatalogSearchOpen(true)
    if (!draft.catalogItemId) return
    onChange({
      ...draft,
      catalogItemId: "",
      identificador: "",
      proceso: "",
      subprocesos: [],
      subprocesoTemp: "",
      productosVinculados: [],
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
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 z-10 h-4 w-4 text-muted-foreground" />
              <Input
                id={`${idPrefix}-catalog-item`}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isCatalogSearchOpen}
                aria-controls={`${idPrefix}-catalog-results`}
                value={catalogSearch}
                onChange={(event) => changeCatalogSearch(event.target.value)}
                onFocus={() => setIsCatalogSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setIsCatalogSearchOpen(false), 120)}
                placeholder={`Buscar ${catalogLabelByTag[draft.etiqueta as keyof typeof catalogLabelByTag]?.toLocaleLowerCase() ?? "registro"}...`}
                autoComplete="off"
                className="pl-9"
              />
              {isCatalogSearchOpen && availableItems.length > 0 && (
                <div
                  id={`${idPrefix}-catalog-results`}
                  role="listbox"
                  className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
                >
                  {filteredAvailableItems.length > 0 ? (
                    filteredAvailableItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={item.id === draft.catalogItemId}
                        className="flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectCatalogItem(item.id)}
                      >
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${item.id === draft.catalogItemId ? "opacity-100" : "opacity-0"}`} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {item.nombre}{item.estado === "inactivo" ? " (inactivo)" : ""}
                          </span>
                          {item.descripcion && (
                            <span className="block truncate text-xs text-muted-foreground">{item.descripcion}</span>
                          )}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-3 text-sm text-muted-foreground">
                      No se encontraron coincidencias.
                    </p>
                  )}
                </div>
              )}
            </div>
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

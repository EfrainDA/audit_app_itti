"use client"

// Administración del catálogo que alimenta la planificación. La pantalla
// conserva separadas las categorías, aplica alcance por unidad y pagina localmente.
import { useMemo, useState } from "react"
import {
  CircleCheck,
  CircleOff,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Network,
  Package,
  Pencil,
  Plus,
  Search,
  Workflow,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CATALOG_CATEGORIES,
  getCatalogItemError,
  normalizeSubprocesses,
} from "@/features/settings/domain/catalog"
import type {
  CatalogItem,
  CatalogItemCategory,
  UnidadNegocio,
} from "@/lib/data"
import { getErrorMessage } from "@/lib/error-message"
import {
  createCatalogItem,
  updateCatalogItem,
  updateCatalogItemStatus,
} from "@/lib/repositories/supabase/catalog"
import { cn } from "@/lib/utils"
import { SettingsSectionHeader } from "./settings-section-header"

const PAGE_SIZE = 100

const categoryIcons = {
  producto: Package,
  proceso: Workflow,
  otro: Boxes,
  area_transversal: Network,
} satisfies Record<CatalogItemCategory, typeof Package>

const nameLabels = {
  producto: "Nombre del producto",
  proceso: "Nombre del proceso",
  otro: "Nombre",
  area_transversal: "Nombre del área",
} satisfies Record<CatalogItemCategory, string>

type CatalogDraft = {
  nombre: string
  subprocesos: string[]
  subprocesoTemporal: string
  unidadNegocioId: string
  productosVinculadosIds: string[]
}

const emptyDraft: CatalogDraft = {
  nombre: "",
  subprocesos: [],
  subprocesoTemporal: "",
  unidadNegocioId: "",
  productosVinculadosIds: [],
}

export function CatalogSettings({
  items,
  units,
  canManage,
  onChanged,
}: {
  items: CatalogItem[]
  units: UnidadNegocio[]
  canManage: boolean
  onChanged: () => Promise<void>
}) {
  const [category, setCategory] = useState<CatalogItemCategory>("producto")
  const [query, setQuery] = useState("")
  const [unitFilter, setUnitFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CatalogItem | null>(null)
  const [draft, setDraft] = useState<CatalogDraft>(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null)

  const definition = CATALOG_CATEGORIES.find((item) => item.id === category) ?? CATALOG_CATEGORIES[0]

  // Filtrado y orden estable de la categoría activa antes de paginar.
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return items
      .filter((item) => item.categoria === category)
      .filter((item) =>
        unitFilter === "all"
        || (unitFilter === "without-unit" ? !item.unidadNegocioId : item.unidadNegocioId === unitFilter),
      )
      .filter((item) => {
        const unitName = units.find((unit) => unit.id === item.unidadNegocioId)?.nombre ?? ""
        return !normalizedQuery
          || item.nombre.toLocaleLowerCase().includes(normalizedQuery)
          || item.descripcion?.toLocaleLowerCase().includes(normalizedQuery)
          || unitName.toLocaleLowerCase().includes(normalizedQuery)
      })
      .sort((first, second) => {
        if (first.estado !== second.estado) return first.estado === "activo" ? -1 : 1
        return first.nombre.localeCompare(second.nombre)
      })
  }, [category, items, query, unitFilter, units])
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Inicializa el mismo formulario para altas y ediciones.
  const showForm = (item?: CatalogItem) => {
    setEditing(item ?? null)
    setDraft(item
      ? {
          nombre: item.nombre,
          subprocesos: item.subprocesos,
          subprocesoTemporal: "",
          unidadNegocioId: item.unidadNegocioId ?? "",
          productosVinculadosIds: item.productosVinculadosIds,
        }
      : emptyDraft)
    setError(null)
    setOpen(true)
  }

  // Normaliza y evita duplicados al convertir el texto temporal en una etiqueta.
  const addSubprocess = () => {
    const nextSubprocesses = normalizeSubprocesses([...draft.subprocesos, draft.subprocesoTemporal])
    if (nextSubprocesses.length === draft.subprocesos.length) return
    setDraft({ ...draft, subprocesos: nextSubprocesses, subprocesoTemporal: "" })
  }

  // Valida el borrador en el dominio y persiste únicamente datos consistentes.
  const save = async () => {
    const subprocesses = normalizeSubprocesses(draft.subprocesos)
    const validationError = getCatalogItemError(
      {
        categoria: category,
        nombre: draft.nombre,
        subprocesos: subprocesses,
        unidadNegocioId: draft.unidadNegocioId || undefined,
        productosVinculadosIds: draft.productosVinculadosIds,
      },
      items,
      editing?.id,
    )
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsSaving(true)
    try {
      const payload = {
        category,
        name: draft.nombre,
        subprocesses,
        businessUnitId: draft.unidadNegocioId || undefined,
        linkedProductIds: draft.productosVinculadosIds,
      }
      if (editing) await updateCatalogItem(editing.id, payload)
      else await createCatalogItem(payload)
      await onChanged()
      setSuccess(`${definition.singular} ${editing ? "actualizado" : "agregado"} correctamente.`)
      setOpen(false)
    } catch (cause) {
      setError(getErrorMessage(cause, "No se pudo guardar el registro del catálogo."))
    } finally {
      setIsSaving(false)
    }
  }

  // Activa o inactiva sin eliminar referencias históricas usadas por controles.
  const changeStatus = async (item: CatalogItem) => {
    const nextStatus = item.estado === "activo" ? "inactivo" : "activo"
    setChangingStatusId(item.id)
    setError(null)
    setSuccess(null)
    try {
      await updateCatalogItemStatus(item.id, nextStatus)
      await onChanged()
      setSuccess(`${definition.singular} ${nextStatus === "activo" ? "activado" : "inactivado"} correctamente.`)
    } catch (cause) {
      setError(getErrorMessage(cause, `No se pudo ${nextStatus === "activo" ? "activar" : "inactivar"} el registro.`))
    } finally {
      setChangingStatusId(null)
    }
  }

  // Los procesos solo pueden vincular productos de su misma unidad de negocio.
  const linkedProductOptions = items
    .filter((item) =>
      item.categoria === "producto"
      && item.unidadNegocioId === draft.unidadNegocioId
      && (item.estado === "activo" || draft.productosVinculadosIds.includes(item.id)),
    )
    .sort((first, second) => first.nombre.localeCompare(second.nombre))

  return (
    <>
      <div className="space-y-3">
        {/* Cabecera, selector de categoría y acciones principales. */}
        <SettingsSectionHeader
          title="Catálogo"
          description="Define los registros disponibles para cada unidad de negocio."
          action={
            <Button size="sm" onClick={() => showForm()} disabled={!canManage}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar {definition.singular.toLocaleLowerCase()}
            </Button>
          }
        >
          <Tabs
            value={category}
            onValueChange={(value) => {
              setCategory(value as CatalogItemCategory)
              setQuery("")
              setUnitFilter("all")
              setPage(1)
              setSuccess(null)
            }}
          >
            <TabsList className="w-full sm:w-fit">
              {CATALOG_CATEGORIES.map((item) => {
                const Icon = categoryIcons[item.id]
                const count = items.filter((catalogItem) =>
                  catalogItem.categoria === item.id && catalogItem.estado === "activo",
                ).length
                return (
                  <TabsTrigger key={item.id} value={item.id}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{count}</Badge>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </SettingsSectionHeader>

        <Card className="overflow-hidden border-border/70 py-0 shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{definition.description}</p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(1)
                  }}
                  placeholder={`Buscar ${definition.label.toLocaleLowerCase()}`}
                  className="pl-9"
                />
              </div>
              {category !== "area_transversal" && (
                <Select
                  value={unitFilter}
                  onValueChange={(value) => {
                    setUnitFilter(value)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-60" aria-label="Filtrar por unidad de negocio">
                    <SelectValue placeholder="Unidad de negocio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las unidades</SelectItem>
                    <SelectItem value="without-unit">Sin unidad asignada</SelectItem>
                    {[...units]
                      .sort((first, second) => first.nombre.localeCompare(second.nombre))
                      .map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>{unit.nombre}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {success && (
            <p role="status" className="border-b border-status-success-border bg-status-success-surface px-5 py-3 text-sm text-status-success-text">
              {success}
            </p>
          )}
          {error && !open && (
            <p role="alert" className="border-b border-status-danger-border bg-status-danger-surface px-5 py-3 text-sm text-status-danger-text">
              {error}
            </p>
          )}

          {/* Tabla compacta con columnas específicas para cada categoría. */}
          <Table
            className={cn(
              "table-fixed",
              category === "proceso"
                ? "min-w-[960px]"
                : category === "area_transversal"
                  ? "min-w-[560px]"
                  : "min-w-[720px]",
            )}
            containerClassName="rounded-none border-0"
          >
            {category === "proceso" ? (
              <colgroup>
                <col className={canManage ? "w-[26%]" : "w-[29%]"} />
                <col className={canManage ? "w-[19%]" : "w-[21%]"} />
                <col className={canManage ? "w-[11%]" : "w-[12%]"} />
                <col className={canManage ? "w-[26%]" : "w-[28%]"} />
                <col className="w-[10%]" />
                {canManage && <col className="w-[8%]" />}
              </colgroup>
            ) : category === "area_transversal" ? (
              <colgroup>
                <col className={canManage ? "w-[70%]" : "w-[80%]"} />
                <col className={canManage ? "w-[18%]" : "w-[20%]"} />
                {canManage && <col className="w-[12%]" />}
              </colgroup>
            ) : (
              <colgroup>
                <col className={canManage ? "w-[42%]" : "w-[48%]"} />
                <col className={canManage ? "w-[34%]" : "w-[37%]"} />
                <col className={canManage ? "w-[14%]" : "w-[15%]"} />
                {canManage && <col className="w-[10%]" />}
              </colgroup>
            )}
            <TableHeader>
              <TableRow>
                <TableHead>{nameLabels[category].replace("Nombre del ", "")}</TableHead>
                {category !== "area_transversal" && <TableHead>Unidad de negocio</TableHead>}
                {category === "proceso" && <TableHead className="text-center">Subprocesos</TableHead>}
                {category === "proceso" && <TableHead>Productos vinculados</TableHead>}
                <TableHead className="text-center">Estado</TableHead>
                {canManage && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((item) => {
                const unitName = units.find((unit) => unit.id === item.unidadNegocioId)?.nombre ?? "Sin unidad"
                const linkedProducts = item.productosVinculadosIds
                  .map((productId) => items.find((product) => product.id === productId)?.nombre)
                  .filter((name): name is string => Boolean(name))
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <span className="block truncate" title={item.nombre}>{item.nombre}</span>
                    </TableCell>
                    {category !== "area_transversal" && (
                      <TableCell>
                        <span className="block truncate" title={unitName}>{unitName}</span>
                      </TableCell>
                    )}
                    {category === "proceso" && (
                      <TableCell className="text-center tabular-nums">{item.subprocesos.length}</TableCell>
                    )}
                    {category === "proceso" && (
                      <TableCell className="max-w-[22rem]">
                        <span className="block truncate" title={linkedProducts.join(", ")}>
                          {linkedProducts.join(", ") || "No aplica"}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Badge variant={item.estado === "activo" ? "default" : "secondary"}>
                        {item.estado === "activo" ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon-sm" variant="ghost" aria-label={`Editar ${item.nombre}`} onClick={() => showForm(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className={item.estado === "activo" ? "text-status-danger-text" : "text-primary"}
                            disabled={changingStatusId !== null}
                            aria-label={item.estado === "activo" ? `Inactivar ${item.nombre}` : `Activar ${item.nombre}`}
                            title={item.estado === "activo" ? "Inactivar" : "Activar"}
                            onClick={() => void changeStatus(item)}
                          >
                            {changingStatusId === item.id
                              ? <span className="h-4 w-4 animate-pulse rounded-full bg-current/40" />
                              : item.estado === "activo"
                                ? <CircleOff className="h-4 w-4" />
                                : <CircleCheck className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              {visibleItems.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2 + (category !== "area_transversal" ? 1 : 0) + (category === "proceso" ? 2 : 0) + (canManage ? 1 : 0)}
                    className="h-28 text-center text-muted-foreground"
                  >
                    {query || unitFilter !== "all"
                      ? "No se encontraron resultados."
                      : `Todavía no hay ${definition.label.toLocaleLowerCase()}.`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {filteredItems.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
              <p className="text-xs text-muted-foreground">
                {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredItems.length)}–{Math.min(currentPage * PAGE_SIZE, filteredItems.length)} de {filteredItems.length}
              </p>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-20 text-center text-sm">Página {currentPage} de {pageCount}</span>
                <Button size="icon" variant="outline" aria-label="Página siguiente" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        </Card>
      </div>

      {/* Formulario contextual de creación y edición. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Agregar"} {definition.singular.toLocaleLowerCase()}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {category !== "area_transversal" && (
              <div className="space-y-2">
                <Label htmlFor="catalog-unit">Unidad de negocio *</Label>
                <Select
                  value={draft.unidadNegocioId}
                  onValueChange={(value) => setDraft({
                    ...draft,
                    unidadNegocioId: value,
                    productosVinculadosIds: value === draft.unidadNegocioId ? draft.productosVinculadosIds : [],
                  })}
                >
                  <SelectTrigger id="catalog-unit" autoFocus><SelectValue placeholder="Seleccionar unidad" /></SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="catalog-name">{nameLabels[category]} *</Label>
              <Input
                id="catalog-name"
                value={draft.nombre}
                onChange={(event) => setDraft({ ...draft, nombre: event.target.value })}
                autoFocus={category === "area_transversal"}
              />
            </div>

            {category === "proceso" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="catalog-subprocess">Subprocesos *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="catalog-subprocess"
                      value={draft.subprocesoTemporal}
                      onChange={(event) => setDraft({ ...draft, subprocesoTemporal: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return
                        event.preventDefault()
                        addSubprocess()
                      }}
                      placeholder="Escribe un subproceso"
                    />
                    <Button type="button" variant="outline" onClick={addSubprocess}>Agregar</Button>
                  </div>
                  <div className="flex min-h-11 flex-wrap gap-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                    {draft.subprocesos.map((subprocess) => (
                      <Badge key={subprocess} variant="outline" className="gap-1.5 bg-background py-1 font-normal">
                        {subprocess}
                        <button
                          type="button"
                          aria-label={`Quitar ${subprocess}`}
                          onClick={() => setDraft({
                            ...draft,
                            subprocesos: draft.subprocesos.filter((item) => item !== subprocess),
                          })}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </Badge>
                    ))}
                    {draft.subprocesos.length === 0 && <span className="text-xs text-muted-foreground">Sin subprocesos agregados.</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Productos vinculados, si aplica</Label>
                  <div className="grid gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 sm:grid-cols-2">
                    {linkedProductOptions.map((product) => {
                      const selected = draft.productosVinculadosIds.includes(product.id)
                      return (
                        <button
                          key={product.id}
                          type="button"
                          aria-pressed={selected}
                          className={cn(
                            "min-h-11 rounded-md border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background hover:border-primary/40",
                          )}
                          onClick={() => setDraft({
                            ...draft,
                            productosVinculadosIds: selected
                              ? draft.productosVinculadosIds.filter((id) => id !== product.id)
                              : [...draft.productosVinculadosIds, product.id],
                          })}
                        >
                          {product.nombre}{product.estado === "inactivo" ? " (inactivo)" : ""}
                        </button>
                      )
                    })}
                    {draft.unidadNegocioId && linkedProductOptions.length === 0 && (
                      <p className="text-sm text-muted-foreground sm:col-span-2">No hay productos para esta unidad.</p>
                    )}
                  </div>
                  {!draft.unidadNegocioId && <p className="text-xs text-muted-foreground">Selecciona primero la unidad de negocio.</p>}
                </div>
              </>
            )}

            {error && <p role="alert" className="text-sm text-status-danger-text">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => void save()} disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Definiciones y validaciones puras del catálogo de planificación.
import type { CatalogItem, CatalogItemCategory } from "@/lib/data"

export const CATALOG_CATEGORIES: Array<{
  id: CatalogItemCategory
  label: string
  singular: string
  description: string
}> = [
  {
    id: "producto",
    label: "Productos",
    singular: "Producto",
    description: "Productos y servicios que pueden formar parte del alcance.",
  },
  {
    id: "proceso",
    label: "Procesos",
    singular: "Proceso",
    description: "Procesos con sus subprocesos o procedimientos asociados.",
  },
  {
    id: "otro",
    label: "Otros",
    singular: "Otro",
    description: "Controles que no corresponden a un producto ni a un proceso.",
  },
  {
    id: "area_transversal",
    label: "Áreas transversales",
    singular: "Área transversal",
    description: "Áreas de alcance transversal disponibles para todas las unidades.",
  },
]

export function normalizeCatalogName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

export function normalizeSubprocesses(values: string[]) {
  const unique = new Map<string, string>()

  for (const value of values) {
    const trimmed = value.trim().replace(/\s+/g, " ")
    const key = normalizeCatalogName(trimmed)
    if (key && !unique.has(key)) unique.set(key, trimmed)
  }

  return [...unique.values()]
}

export function getCatalogItemError(
  input: Pick<CatalogItem, "categoria" | "nombre" | "subprocesos" | "unidadNegocioId" | "productosVinculadosIds">,
  existingItems: CatalogItem[],
  editingId?: string,
) {
  if (input.nombre.trim().length < 2) return "Ingresa un nombre de al menos dos caracteres."
  if (input.categoria !== "area_transversal" && !input.unidadNegocioId) {
    return "Selecciona la unidad de negocio."
  }
  if (input.categoria === "proceso" && normalizeSubprocesses(input.subprocesos).length === 0) {
    return "Agrega al menos un subproceso o procedimiento."
  }
  if (input.categoria === "proceso" && input.productosVinculadosIds.some((productId) => {
    const linkedProduct = existingItems.find((item) => item.id === productId)
    return linkedProduct?.categoria !== "producto"
      || linkedProduct.unidadNegocioId !== input.unidadNegocioId
  })) {
    return "Los productos vinculados deben pertenecer a la misma unidad de negocio."
  }

  const normalizedName = normalizeCatalogName(input.nombre)
  const isDuplicate = existingItems.some(
    (item) =>
      item.id !== editingId
      && item.categoria === input.categoria
      && item.unidadNegocioId === input.unidadNegocioId
      && normalizeCatalogName(item.nombre) === normalizedName,
  )

  return isDuplicate ? "Ya existe un registro con este nombre en la categoría." : null
}

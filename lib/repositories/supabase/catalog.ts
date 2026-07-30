// Persistencia del catálogo mediante una RPC que mantiene atómicas las
// relaciones entre procesos y productos.
import { normalizeSubprocesses } from "@/features/settings/domain/catalog"
import type { CatalogItem, CatalogItemCategory } from "@/lib/data"
import { supabase } from "@/lib/supabase"
import { requireManager } from "./access"

type CatalogItemInput = {
  category: CatalogItemCategory
  name: string
  description?: string
  subprocesses?: string[]
  businessUnitId?: string
  linkedProductIds?: string[]
}

function catalogPayload(input: CatalogItemInput) {
  return {
    category: input.category,
    name: input.name.trim().replace(/\s+/g, " "),
    description: input.description?.trim() || null,
    subprocesses: input.category === "proceso"
      ? normalizeSubprocesses(input.subprocesses ?? [])
      : [],
    businessUnitId: input.category === "area_transversal" ? null : input.businessUnitId || null,
    linkedProductIds: input.category === "proceso" ? input.linkedProductIds ?? [] : [],
  }
}

export async function createCatalogItem(input: CatalogItemInput) {
  await requireManager()
  const { error } = await supabase.rpc("save_catalog_item", { payload: catalogPayload(input) })
  if (error) throw error
}

export async function updateCatalogItem(id: string, input: CatalogItemInput) {
  await requireManager()
  const { error } = await supabase.rpc("save_catalog_item", { payload: { id, ...catalogPayload(input) } })
  if (error) throw error
}

export async function updateCatalogItemStatus(id: string, status: CatalogItem["estado"]) {
  await requireManager()
  const { error } = await supabase
    .from("catalog_items")
    .update({ status })
    .eq("id", id)
  if (error) throw error
}

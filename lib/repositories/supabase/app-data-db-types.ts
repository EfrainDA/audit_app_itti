// Tipos internos que reflejan filas y relaciones devueltas por Supabase.
// app-data-query los adapta antes de exponerlos a los componentes.
import type { CatalogItem, Control } from "@/lib/data"

export type DbCatalogItem = {
  id: string
  category: CatalogItem["categoria"]
  name: string
  description: string | null
  subprocesses: string[] | null
  business_unit_id: string | null
  linked_product_id: string | null
  catalog_process_products: { product_id: string }[] | null
  status: CatalogItem["estado"]
  created_at: string
}

export type DbControl = {
  id: string
  lot_vertical_id: string
  identifier: string
  description: string | null
  status: Control["estado"] | "terminada"
  control_score: number | null
  tag: Control["etiqueta"] | null
  catalog_item_id: string | null
  process: string | null
  subprocess: string | null
  subprocesses: string[] | null
  corresponds_to_process: boolean
  product: string | null
  linked_products: string[] | null
  auditor_id: string | null
  created_at: string
}

export type DbLotVertical = {
  id: string
  lot_id: string
  vertical_id: string
  controls: DbControl[]
}

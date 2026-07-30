import { describe, expect, it } from "vitest"

import type { CatalogItem } from "@/lib/data"
import {
  getCatalogItemError,
  normalizeCatalogName,
  normalizeSubprocesses,
} from "./catalog"

const product: CatalogItem = {
  id: "product-1",
  categoria: "producto",
  nombre: "Billetera Digital",
  subprocesos: [],
  unidadNegocioId: "unit-1",
  productosVinculadosIds: [],
  estado: "activo",
  fechaCreacion: "2026-07-30",
}

describe("catálogo de planificación", () => {
  it("normaliza nombres para detectar duplicados semánticos", () => {
    expect(normalizeCatalogName("  Gestión   de Créditos ")).toBe("gestion de creditos")
    expect(getCatalogItemError(
      { categoria: "producto", nombre: "billetera digital", subprocesos: [], unidadNegocioId: "unit-1", productosVinculadosIds: [] },
      [product],
    )).toMatch(/existe/i)
  })

  it("elimina subprocesos vacíos y repetidos sin perder su presentación", () => {
    expect(normalizeSubprocesses([" Alta ", "alta", "", "Baja"])).toEqual(["Alta", "Baja"])
  })

  it("exige subprocesos solamente para la categoría proceso", () => {
    expect(getCatalogItemError(
      { categoria: "proceso", nombre: "Ventas", subprocesos: [], unidadNegocioId: "unit-1", productosVinculadosIds: [] },
      [],
    )).toMatch(/subproceso/i)
    expect(getCatalogItemError(
      { categoria: "otro", nombre: "Control general", subprocesos: [], unidadNegocioId: "unit-1", productosVinculadosIds: [] },
      [],
    )).toBeNull()
  })

  it("permite repetir un nombre en unidades diferentes", () => {
    expect(getCatalogItemError(
      { categoria: "producto", nombre: product.nombre, subprocesos: [], unidadNegocioId: "unit-2", productosVinculadosIds: [] },
      [product],
    )).toBeNull()
  })

  it("solo vincula procesos con productos de la misma unidad", () => {
    expect(getCatalogItemError(
      {
        categoria: "proceso",
        nombre: "Ventas",
        subprocesos: ["Alta"],
        unidadNegocioId: "unit-2",
        productosVinculadosIds: [product.id],
      },
      [product],
    )).toMatch(/misma unidad/i)
  })
})

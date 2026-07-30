import { describe, expect, it } from "vitest"
import {
  buildBusinessUnitControlName,
  createEmptyControlDraft,
  getControlDraftError,
  isBusinessUnitTag,
  isProcessTag,
  splitBusinessUnitControlName,
  toggleListValue,
} from "./control-naming"

describe("nombres de controles", () => {
  it("construye y separa nombres de unidad de negocio", () => {
    const name = buildBusinessUnitControlName("Receptora", "Prestadora")
    expect(name).toBe("Receptora - Prestadora")
    expect(splitBusinessUnitControlName(name)).toEqual({
      recibe: "Receptora",
      presta: "Prestadora",
    })
  })

  it("no construye nombres incompletos", () => {
    expect(buildBusinessUnitControlName("", "Prestadora")).toBe("")
    expect(splitBusinessUnitControlName("Unidad")).toEqual({
      recibe: "Unidad",
      presta: "",
    })
  })

  it("clasifica las etiquetas", () => {
    expect(isProcessTag("Proceso")).toBe(true)
    expect(isProcessTag("Proceso de apoyo")).toBe(true)
    expect(isBusinessUnitTag("Unidad de Negocio")).toBe(true)
    expect(isBusinessUnitTag("Producto")).toBe(false)
  })

  it("valida borradores según el tipo de control", () => {
    const draft = createEmptyControlDraft()
    expect(getControlDraftError(draft)).toMatch(/analista/i)
    draft.auditorId = "auditor"
    expect(getControlDraftError(draft)).toMatch(/catálogo/i)
    draft.etiqueta = "Unidad de Negocio"
    draft.unidadRecibeServicio = "A"
    draft.unidadPrestaServicio = "B"
    expect(getControlDraftError(draft)).toBeNull()

    draft.etiqueta = "Proceso"
    draft.catalogItemId = "process-1"
    expect(getControlDraftError(draft)).toMatch(/proceso/i)
    draft.proceso = "Proceso"
    draft.subprocesos = ["Subproceso"]
    expect(getControlDraftError(draft)).toBeNull()
    draft.productosVinculados = ["Producto"]
    expect(getControlDraftError(draft)).toBeNull()
  })

  it("agrega y retira valores sin mutar la lista original", () => {
    const original = ["A"]
    expect(toggleListValue(original, "B")).toEqual(["A", "B"])
    expect(toggleListValue(original, "A")).toEqual([])
    expect(original).toEqual(["A"])
  })
})

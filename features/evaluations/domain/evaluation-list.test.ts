import { describe, expect, it } from "vitest"
import { controlMatchesFilters, matchesControlStatus } from "./evaluation-list"
import type { Control } from "../../../lib/data"

const control: Control = {
  id: "control-1",
  loteVerticalId: "vertical-1",
  identificador: "Producto Premium",
  estado: "pendiente",
  fechaCreacion: "2026-07-29",
}

describe("filtros de evaluaciones", () => {
  it("normaliza los estados terminados", () => {
    expect(matchesControlStatus("terminada", "terminado")).toBe(true)
    expect(matchesControlStatus("pendiente", "terminado")).toBe(false)
  })

  it("busca por campos del control y considera respuestas iniciadas", () => {
    expect(controlMatchesFilters(control, "premium", "all", new Set())).toBe(true)
    expect(controlMatchesFilters(control, "inexistente", "all", new Set())).toBe(false)
    expect(controlMatchesFilters(control, "", "en_curso", new Set([control.id]))).toBe(true)
  })
})

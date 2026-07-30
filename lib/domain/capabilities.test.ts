import { describe, expect, it } from "vitest"
import { canAccessPath, getAllowedRoutes } from "./capabilities"

describe("matriz de capacidades", () => {
  it("limita CEO al dashboard y evaluaciones", () => {
    expect(getAllowedRoutes("ceo").map((route) => route.href)).toEqual(["/", "/evaluaciones"])
    expect(canAccessPath("ceo", "/evaluaciones/control-id")).toBe(true)
    expect(canAccessPath("ceo", "/ajustes")).toBe(false)
  })

  it("mantiene acceso completo para administrador", () => {
    expect(canAccessPath("admin", "/ajustes/usuarios")).toBe(true)
    expect(canAccessPath("admin", "/modelos/nuevo")).toBe(true)
    expect(canAccessPath("admin", "/planificacion/lote-id")).toBe(true)
  })

  it("no ofrece modelos ni ajustes al auditor", () => {
    expect(canAccessPath("auditor", "/modelos")).toBe(false)
    expect(canAccessPath("auditor", "/ajustes")).toBe(false)
  })
})

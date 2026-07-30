import { describe, expect, it } from "vitest"
import { validatePassword } from "./password-policy"

describe("política de contraseñas", () => {
  it("acepta una contraseña que cumple todos los requisitos", () => {
    expect(validatePassword("Correcta1234")).toEqual({ valid: true, issues: [] })
  })

  it.each([
    ["Corta1", "length"],
    ["sinmayuscula123", "uppercase"],
    ["SINMINUSCULA123", "lowercase"],
    ["SinNumerosAqui", "number"],
  ])("rechaza %s por %s", (password, issue) => {
    const result = validatePassword(password)
    expect(result.valid).toBe(false)
    expect(result.issues).toContain(issue)
  })
})

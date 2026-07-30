import { describe, expect, it } from "vitest"
import { getCycleDates, validateCycleInput } from "./cycles"

describe("ciclos configurables", () => {
  it("calcula el primer y último día del rango", () => {
    expect(getCycleDates({ year: 2028, startMonth: 2, endMonth: 2 })).toEqual({
      startDate: "2028-02-01",
      endDate: "2028-02-29",
    })
  })

  it("rechaza rangos invertidos o fuera de calendario", () => {
    expect(() => validateCycleInput({ year: 2026, startMonth: 8, endMonth: 7 })).toThrow()
    expect(() => validateCycleInput({ year: 2026, startMonth: 0, endMonth: 2 })).toThrow()
    expect(() => validateCycleInput({ year: 2200, startMonth: 1, endMonth: 2 })).toThrow()
  })
})

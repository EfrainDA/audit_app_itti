import { afterEach, describe, expect, it, vi } from "vitest"
import {
  getActiveCycle,
  getCounts,
  getDaysUntil,
  getExecutiveScoreTone,
  getSemaphore,
} from "./metrics"

describe("metricas del dashboard", () => {
  afterEach(() => vi.useRealTimers())

  it("clasifica controles y calcula avance y promedio", () => {
    const metrics = getCounts([
      { id: "pending", estado: "pendiente" },
      { id: "answered", estado: "pendiente", scoreControl: 60 },
      { id: "course", estado: "en_curso", scoreControl: 80 },
      { id: "done", estado: "terminado", scoreControl: 100 },
    ], new Set(["answered"]))

    expect(metrics).toEqual({
      total: 4,
      pending: 1,
      inCourse: 2,
      completed: 1,
      started: 3,
      risk: 2,
      score: 80,
      progressPct: 75,
    })
  })

  it("maneja una coleccion vacia sin divisiones invalidas", () => {
    expect(getCounts([])).toMatchObject({
      total: 0,
      score: 0,
      progressPct: 0,
      risk: 0,
    })
  })

  it("selecciona el ciclo vigente y calcula días restantes", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"))
    const cycles = [
      {
        id: "old",
        año: 2026,
        bimestre: 2,
        mesInicio: 3,
        mesFin: 4,
        fechaInicio: "2026-03-01",
        fechaFin: "2026-04-30",
      },
      {
        id: "current",
        año: 2026,
        bimestre: 4,
        mesInicio: 7,
        mesFin: 8,
        fechaInicio: "2026-07-01",
        fechaFin: "2026-08-31",
      },
    ]

    expect(getActiveCycle(cycles).id).toBe("current")
    expect(getDaysUntil("2026-07-16")).toBe(2)
  })

  it("mantiene estables los umbrales visuales", () => {
    expect(getSemaphore(49).text).toBe("text-status-danger-text")
    expect(getSemaphore(50).text).toBe("text-status-warning-text")
    expect(getSemaphore(80).text).toBe("text-status-success-text")
    expect(getExecutiveScoreTone(undefined).label).toBe("Sin dato")
    expect(getExecutiveScoreTone(59).label).toBe("Crítico")
    expect(getExecutiveScoreTone(60).label).toBe("Aceptable")
    expect(getExecutiveScoreTone(85).label).toBe("Óptimo")
  })

  it("clasifica el score con los umbrales configurados en Ajustes", () => {
    const thresholds = [
      { id: "red", nombre: "Atención", min: 0, max: 74, color: "rojo" as const },
      { id: "yellow", nombre: "En objetivo", min: 75, max: 94, color: "amarillo" as const },
      { id: "green", nombre: "Excelente", min: 95, max: 100, color: "verde" as const },
    ]

    expect(getExecutiveScoreTone(74, thresholds).label).toBe("Atención")
    expect(getExecutiveScoreTone(75, thresholds).label).toBe("En objetivo")
    expect(getExecutiveScoreTone(94, thresholds).label).toBe("En objetivo")
    expect(getExecutiveScoreTone(95, thresholds).label).toBe("Excelente")
  })
})

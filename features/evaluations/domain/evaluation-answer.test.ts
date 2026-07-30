import { describe, expect, it } from "vitest"
import {
  MAX_EVIDENCE_FILE_SIZE,
  calculateEvaluationScore,
  createEmptyRespuesta,
  getEvaluationProgress,
  getRespuestaValorLabel,
  isAcceptedEvidenceFile,
  toAnswerPayload,
} from "./evaluation-answer"

describe("respuestas de evaluación", () => {
  it("crea borradores independientes y genera el payload esperado", () => {
    const answer = createEmptyRespuesta("parameter-1")
    answer.personasAuditadas = [" Persona ", "Segunda persona"]
    answer.cargos = [" Gerente ", "Otro cargo"]
    answer.areas = [" Finanzas ", "Otra área"]

    expect(createEmptyRespuesta("parameter-2").personasAuditadas).toEqual([""])
    expect(toAnswerPayload(answer)).toEqual({
      parametroId: "parameter-1",
      valor: null,
      comentario: "",
      personasAuditadas: ["Persona"],
      cargos: ["Gerente"],
      areas: ["Finanzas"],
      fechaRespuesta: undefined,
    })
  })

  it("valida extensión, MIME, contenido y tamaño de evidencias", () => {
    expect(isAcceptedEvidenceFile(new File(["ok"], "evidence.pdf", { type: "application/pdf" }))).toBe(true)
    expect(isAcceptedEvidenceFile(new File(["bad"], "evidence.exe", { type: "application/pdf" }))).toBe(false)
    expect(isAcceptedEvidenceFile(new File(["bad"], "evidence.pdf", { type: "application/octet-stream" }))).toBe(false)
    expect(isAcceptedEvidenceFile(new File([], "empty.pdf", { type: "application/pdf" }))).toBe(false)
    expect(isAcceptedEvidenceFile({
      name: "large.pdf",
      type: "application/pdf",
      size: MAX_EVIDENCE_FILE_SIZE + 1,
    } as File)).toBe(false)
  })

  it("presenta etiquetas de todos los estados", () => {
    expect(getRespuestaValorLabel(null)).toBe("Sin responder")
    expect(getRespuestaValorLabel("cumple")).toBe("Cumple")
    expect(getRespuestaValorLabel("intermedio")).toBe("Intermedio")
    expect(getRespuestaValorLabel("no_cumple")).toBe("No cumple")
    expect(getRespuestaValorLabel("na")).toBe("N/A")
  })

  it("calcula score excluyendo N/A del denominador", () => {
    const parameters = [
      { id: "a", puntosBase: 40 },
      { id: "b", puntosBase: 40 },
      { id: "c", puntosBase: 20 },
    ]
    expect(calculateEvaluationScore(parameters, {
      a: { valor: "cumple" },
      b: { valor: "intermedio" },
      c: { valor: "na" },
    })).toBe(75)
    expect(calculateEvaluationScore(parameters, {
      a: { valor: "na" },
      b: { valor: "na" },
      c: { valor: "na" },
    })).toBeNull()
  })

  it("calcula avance sin confundir cero respuestas con completitud", () => {
    expect(getEvaluationProgress(["a", "b"], { a: { valor: "cumple" } })).toEqual({
      total: 2,
      answered: 1,
      complete: false,
      percentage: 50,
    })
    expect(getEvaluationProgress([], {})).toEqual({
      total: 0,
      answered: 0,
      complete: false,
      percentage: 0,
    })
  })
})

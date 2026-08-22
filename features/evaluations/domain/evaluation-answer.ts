// Reglas puras y contratos del formulario de evaluación. Este módulo no
// depende de React ni de Supabase y puede validarse con pruebas unitarias.
export type RespuestaValor = "cumple" | "intermedio" | "no_cumple" | "na" | null

export interface EvidenceAttachment {
  name: string
  path: string
  type?: string
}

export interface EditableRespuesta {
  id?: string
  parametroId: string
  valor: RespuestaValor
  personasAuditadas: string[]
  cargos: string[]
  areas: string[]
  fechaRespuesta?: string
  comentario: string
  evidencias: EvidenceAttachment[]
}

export type EvaluationAnswerInput = {
  parametroId: string
  valor: RespuestaValor
  comentario: string
  personasAuditadas: string[]
  cargos: string[]
  areas: string[]
  fechaRespuesta?: string
}

export const MAX_EVIDENCE_FILES = 3
export const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024

export const EVIDENCE_FILE_ACCEPT = [
  ".pdf", ".docx", ".txt", ".xlsx", ".csv", ".pptx",
  ".jpg", ".jpeg", ".png", ".webp", ".gif",
].join(",")

const evidenceFileExtensions = new Set(
  EVIDENCE_FILE_ACCEPT.split(",").filter((item) => item.startsWith(".")).map((item) => item.toLowerCase()),
)
const evidenceMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

export function createEmptyRespuesta(parametroId: string): EditableRespuesta {
  return {
    parametroId,
    valor: null,
    personasAuditadas: [""],
    cargos: [""],
    areas: [""],
    comentario: "",
    evidencias: [],
  }
}

export function toAnswerPayload(respuesta: EditableRespuesta): EvaluationAnswerInput {
  return {
    parametroId: respuesta.parametroId,
    valor: respuesta.valor,
    comentario: respuesta.comentario,
    personasAuditadas: [respuesta.personasAuditadas[0]?.trim() ?? ""],
    cargos: [respuesta.cargos[0]?.trim() ?? ""],
    areas: [respuesta.areas[0]?.trim() ?? ""],
    fechaRespuesta: respuesta.fechaRespuesta,
  }
}

export function getRespuestaValorLabel(valor: RespuestaValor) {
  if (!valor) return "Sin responder"
  return {
    cumple: "Cumple",
    intermedio: "Intermedio",
    no_cumple: "No cumple",
    na: "N/A",
  }[valor]
}

export function formatFechaRespuesta(fechaRespuesta?: string) {
  if (!fechaRespuesta) return "Sin responder"
  return new Date(fechaRespuesta).toLocaleString("es-PY", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

export function isAcceptedEvidenceFile(file: File) {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
  return (
    file.size > 0
    && file.size <= MAX_EVIDENCE_FILE_SIZE
    && evidenceFileExtensions.has(extension)
    && evidenceMimeTypes.has(file.type.toLowerCase())
  )
}

type ScoredParameter = {
  id: string
  puntosBase: number
}

export function calculateEvaluationScore(
  parameters: ScoredParameter[],
  answers: Record<string, Pick<EditableRespuesta, "valor"> | undefined>,
) {
  let earned = 0
  let available = 0

  for (const parameter of parameters) {
    const value = answers[parameter.id]?.valor
    if (value === "na") continue
    available += parameter.puntosBase
    if (value === "cumple") earned += parameter.puntosBase
    else if (value === "intermedio") earned += parameter.puntosBase * 0.5
  }

  return available === 0 ? null : Math.round((earned / available) * 100)
}

export function getEvaluationProgress(
  parameterIds: string[],
  answers: Record<string, Pick<EditableRespuesta, "valor"> | undefined>,
) {
  const answered = parameterIds.filter((id) => answers[id]?.valor !== null && answers[id]?.valor !== undefined).length
  return {
    total: parameterIds.length,
    answered,
    complete: parameterIds.length > 0 && answered === parameterIds.length,
    percentage: parameterIds.length ? (answered / parameterIds.length) * 100 : 0,
  }
}

// Lectura y persistencia del dominio de evaluaciones. Los borradores y cierres
// se delegan a RPC transaccionales para mantener respuestas y estados atómicos.
import type { EvaluationAnswerInput } from "@/features/evaluations/domain/evaluation-answer";
import { supabase } from "@/lib/supabase";

export type { EvaluationAnswerInput } from "@/features/evaluations/domain/evaluation-answer";

type EvidenceRow = { file_name: string | null; file_url: string }
type AnswerRow = {
  id: string
  parameter_id: string
  value: EvaluationAnswerInput["valor"]
  comment: string | null
  audited_people: string[] | null
  audited_roles: string[] | null
  audited_areas?: string[] | null
  answered_at: string
  answer_evidences: EvidenceRow[] | null
}

export async function fetchAnswersForControl(controlId: string) {
  const result = await supabase
    .from("answers")
    .select("id,parameter_id,value,comment,audited_people,audited_roles,audited_areas,answered_at,answer_evidences(file_name,file_url)")
    .eq("control_id", controlId)

  let data = result.data
  let error = result.error

  if (
    error?.code === "42703"
    && error.message.includes("audited_areas")
  ) {
    const legacyResult = await supabase
      .from("answers")
      .select("id,parameter_id,value,comment,audited_people,audited_roles,answered_at,answer_evidences(file_name,file_url)")
      .eq("control_id", controlId)

    data = legacyResult.data as typeof data
    error = legacyResult.error
  }

  if (error) throw error

  return ((data ?? []) as AnswerRow[]).map((answer) => ({
    id: answer.id,
    parametroId: answer.parameter_id,
    valor: answer.value,
    comentario: answer.comment ?? "",
    personasAuditadas: answer.audited_people?.length ? answer.audited_people : [""],
    cargos: answer.audited_roles?.length ? answer.audited_roles : [""],
    areas: answer.audited_areas?.length ? answer.audited_areas : [""],
    fechaRespuesta: answer.answered_at,
    evidencias: (answer.answer_evidences ?? []).map((evidence) => evidence.file_name || evidence.file_url),
  }))
}

export async function saveEvaluationDraft(controlId: string, answers: EvaluationAnswerInput[]) {
  if (!answers.length) return
  const { error } = await supabase.rpc("save_evaluation", {
    p_control_id: controlId,
    p_lot_id: null,
    p_answers: answers,
    p_finalize: false,
    p_score: null,
  })
  if (error) throw error
}

export async function finalizeEvaluation(input: {
  lotId: string
  controlId: string
  score: number | null
  answers: EvaluationAnswerInput[]
}) {
  const { error } = await supabase.rpc("save_evaluation", {
    p_control_id: input.controlId,
    p_lot_id: input.lotId,
    p_answers: input.answers,
    p_finalize: true,
    p_score: input.score,
  })
  if (error) throw error
}

// Validación y carga de evidencias al bucket privado. Los nombres se estructuran
// por control y respuesta para que las políticas de Storage puedan autorizarlos.
import { isAcceptedEvidenceFile } from "@/features/evaluations/domain/evaluation-answer"
import { supabase } from "@/lib/supabase"
import { requireActiveProfile } from "./access"

const BUCKET = "answer-evidences"

export async function getEvidenceSignedUrl(path: string, fileName?: string, download = false) {
  await requireActiveProfile()
  const options = download ? { download: fileName || true } : undefined
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60, options)
  if (error) throw error
  return data.signedUrl
}

function safeFileName(name: string) {
  return name.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-")
}

async function uploadFile(path: string, file: File) {
  if (!isAcceptedEvidenceFile(file)) {
    throw new Error(`El archivo "${file.name}" no cumple el tipo o tamaño permitido.`)
  }
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (error) throw error
}

async function rollbackUploads(paths: string[]) {
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
}

export async function saveAnswerEvidenceFiles(
  controlId: string,
  filesByParameter: Record<string, File[]>,
) {
  await requireActiveProfile()
  const entries = Object.entries(filesByParameter).filter(([, files]) => files.length)
  if (!entries.length) return

  const parameterIds = entries.map(([parameterId]) => parameterId)
  const { data: answers, error: answersError } = await supabase
    .from("answers")
    .select("id,parameter_id")
    .eq("control_id", controlId)
    .in("parameter_id", parameterIds)
  if (answersError) throw answersError

  const answerIds = new Map((answers ?? []).map((answer) => [answer.parameter_id, answer.id]))
  const rows: Array<{ answer_id: string; file_url: string; file_name: string; file_type: string | null }> = []
  const uploadedPaths: string[] = []

  try {
    for (const [parameterId, files] of entries) {
      const answerId = answerIds.get(parameterId)
      if (!answerId) continue
      for (const file of files) {
        const path = `${controlId}/${answerId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
        await uploadFile(path, file)
        uploadedPaths.push(path)
        rows.push({
          answer_id: answerId,
          file_url: path,
          file_name: file.name,
          file_type: file.type || null,
        })
      }
    }

    if (rows.length) {
      const { error } = await supabase.from("answer_evidences").insert(rows)
      if (error) throw error
    }
  } catch (error) {
    await rollbackUploads(uploadedPaths)
    throw error
  }
}

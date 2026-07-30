import { EvaluacionDetail } from "@/components/evaluaciones/evaluacion-detail"

export default async function EvaluacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <EvaluacionDetail controlId={id} />
}

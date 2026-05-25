import { MainLayout } from "@/components/layout/main-layout"
import { EvaluacionDetail } from "@/components/evaluaciones/evaluacion-detail"

export default async function EvaluacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <MainLayout title="Evaluación de control">
      <EvaluacionDetail controlId={id} />
    </MainLayout>
  )
}

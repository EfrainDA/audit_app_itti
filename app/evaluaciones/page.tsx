import { MainLayout } from "@/components/layout/main-layout"
import { EvaluacionesContent } from "@/components/evaluaciones/evaluaciones-content"

export default function EvaluacionesPage() {
  return (
    <MainLayout title="Evaluaciones" subtitle="Ejecución y seguimiento de auditorías">
      <EvaluacionesContent />
    </MainLayout>
  )
}

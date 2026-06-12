import { MainLayout } from "@/components/layout/main-layout"
import { EvaluacionesContent } from "@/components/evaluaciones/evaluaciones-content"

export default function EvaluacionesPage() {
  return (
    <MainLayout title="Evaluaciones" subtitle="Ejecucion y seguimiento de auditorias">
      <EvaluacionesContent />
    </MainLayout>
  )
}

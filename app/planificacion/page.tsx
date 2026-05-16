import { MainLayout } from "@/components/layout/main-layout"
import { PlanificacionContent } from "@/components/planificacion/planificacion-content"

export default function PlanificacionPage() {
  return (
    <MainLayout title="Planificación" subtitle="Gestión de lotes y auditorías">
      <PlanificacionContent />
    </MainLayout>
  )
}

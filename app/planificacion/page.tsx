import { MainLayout } from "@/components/layout/main-layout"
import { PlanificacionContent } from "@/components/planificacion/planificacion-content"

export default function PlanificacionPage() {
  return (
    <MainLayout title="Planificacion" subtitle="Gestion de lotes y auditorias">
      <PlanificacionContent />
    </MainLayout>
  )
}

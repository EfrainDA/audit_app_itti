import { MainLayout } from "@/components/layout/main-layout"
import { ModelosContent } from "@/components/modelos/modelos-content"

export default function ModelosPage() {
  return (
    <MainLayout title="Modelos de Control" subtitle="Gestion de metodologias de auditoria">
      <ModelosContent />
    </MainLayout>
  )
}

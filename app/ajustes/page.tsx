import { MainLayout } from "@/components/layout/main-layout"
import { AjustesContent } from "@/components/ajustes/ajustes-content"

export default function AjustesPage() {
  return (
    <MainLayout title="Ajustes" subtitle="Configuracion del sistema">
      <AjustesContent />
    </MainLayout>
  )
}

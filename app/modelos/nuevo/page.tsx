import { MainLayout } from "@/components/layout/main-layout"
import { ModeloForm } from "@/components/modelos/modelo-form"

export default function NuevoModeloPage() {
  return (
    <MainLayout title="Nuevo Modelo">
      <div className="w-full space-y-3">
        <ModeloForm redirectOnSaved="/modelos" cancelHref="/modelos" />
      </div>
    </MainLayout>
  )
}

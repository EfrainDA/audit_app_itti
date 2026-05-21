"use client"

import { EvaluacionesContent } from "@/components/evaluaciones/evaluaciones-content"
import { MainLayout } from "@/components/layout/main-layout"

export default function CalificacionesPage() {
  return (
    <MainLayout title="Calificaciones" subtitle="Resultados y calificacion por unidad de negocio">
      <EvaluacionesContent view="calificaciones" />
    </MainLayout>
  )
}

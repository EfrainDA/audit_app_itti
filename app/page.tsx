import { MainLayout } from "@/components/layout/main-layout"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

export default function DashboardPage() {
  return (
    <MainLayout title="Dashboard" subtitle="Vista general del sistema de auditorias">
      <DashboardContent />
    </MainLayout>
  )
}

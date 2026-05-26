import { MainLayout } from "@/components/layout/main-layout"
import { ProfilePreferences } from "@/components/preferencias/profile-preferences"

export default function PreferenciasPage() {
  return (
    <MainLayout title="Preferencias" subtitle="Perfil y seguridad de tu cuenta">
      <ProfilePreferences />
    </MainLayout>
  )
}

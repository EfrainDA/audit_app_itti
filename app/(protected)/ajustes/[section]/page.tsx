import {
  AjustesSectionContent,
  type SettingsSection,
} from "@/components/ajustes/ajustes-content"

export default async function AjustesSectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params

  return <AjustesSectionContent section={section as SettingsSection} />
}

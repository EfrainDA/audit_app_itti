import { supabase } from "@/lib/supabase"
import { requireManager } from "./access"

type BusinessUnitInput = {
  name: string
  ecosystem: string
  logoUrl?: string | null
}

export async function createBusinessUnit(input: BusinessUnitInput) {
  await requireManager()
  const { error } = await supabase.from("business_units").insert({
    name: input.name.trim(),
    ecosystem: input.ecosystem.trim(),
    logo_url: input.logoUrl || null,
  })
  if (error) throw error
}

export async function updateBusinessUnit(id: string, input: BusinessUnitInput) {
  await requireManager()
  const { error } = await supabase
    .from("business_units")
    .update({
      name: input.name.trim(),
      ecosystem: input.ecosystem.trim(),
      logo_url: input.logoUrl || null,
    })
    .eq("id", id)
  if (error) throw error
}

export async function deleteBusinessUnit(id: string) {
  await requireManager()
  const { error } = await supabase.from("business_units").delete().eq("id", id)
  if (error) throw error
}

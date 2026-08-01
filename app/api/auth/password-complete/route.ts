import { createServerAdminClient, getBearerToken } from "@/lib/server-auth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 })
  const admin = createServerAdminClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 })
  const { error: updateError } = await admin.auth.admin.updateUserById(data.user.id, { app_metadata: { ...data.user.app_metadata, must_change_password: false } })
  if (updateError) return NextResponse.json({ error: "No se pudo completar el cambio de contraseña." }, { status: 500 })
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
}

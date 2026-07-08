import { NextResponse } from "next/server"
import { createServerAdminClient, createServerAuthClient, getBearerToken, getServerSupabaseConfig } from "@/lib/server-auth"

type UserProfile = {
  id: string
  name: string
  email: string
  role: "admin" | "supervisor" | "auditor" | "auditado"
  status: "activo" | "inactivo"
  avatar: string | null
  company: string | null
  cargo: string | null
  area: string | null
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function metadataValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export async function POST(request: Request) {
  const config = getServerSupabaseConfig()
  if (!config.supabaseServiceRoleKey) {
    return errorResponse("Falta configurar SUPABASE_AUTH_ADMIN_KEY en el servidor.", 500)
  }

  const token = getBearerToken(request)
  if (!token) return errorResponse("No se encontro una sesion valida.", 401)

  const authClient = createServerAuthClient()
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) {
    return errorResponse("La sesion ya no es valida.", 401)
  }

  const adminClient = createServerAdminClient()
  const authUser = authData.user
  const email = authUser.email ?? ""
  if (!email) return errorResponse("La cuenta autenticada no tiene correo asociado.", 403)

  const selectColumns = "id,name,email,role,status,avatar,company,cargo,area"
  const { data: profileByAuthId, error: authIdError } = await adminClient
    .from("users")
    .select(selectColumns)
    .eq("auth_user_id", authUser.id)
    .maybeSingle<UserProfile>()

  if (authIdError) return errorResponse(authIdError.message, 500)
  if (profileByAuthId) {
    if (profileByAuthId.status !== "activo") return errorResponse("El usuario no esta activo.", 403)
    return NextResponse.json({ profile: profileByAuthId })
  }

  const { data: profileByEmail, error: emailError } = await adminClient
    .from("users")
    .select(selectColumns)
    .ilike("email", email)
    .maybeSingle<UserProfile>()

  if (emailError) return errorResponse(emailError.message, 500)
  if (!profileByEmail) {
    const metadata = authUser.user_metadata ?? {}
    const displayName = metadataValue(metadata.name) ?? metadataValue(metadata.full_name) ?? email.split("@")[0] ?? "Usuario"
    const { data: createdProfile, error: insertError } = await adminClient
      .from("users")
      .insert({
        auth_user_id: authUser.id,
        name: displayName,
        email,
        company: metadataValue(metadata.company) ?? metadataValue(metadata.empresa),
        cargo: metadataValue(metadata.cargo),
        area: metadataValue(metadata.area),
        role: "auditor",
        status: "activo",
      })
      .select(selectColumns)
      .single<UserProfile>()

    if (insertError) return errorResponse(insertError.message, 500)
    return NextResponse.json({ profile: createdProfile })
  }

  if (profileByEmail.status !== "activo") return errorResponse("El usuario no esta activo.", 403)

  const metadata = authUser.user_metadata ?? {}
  const { data: linkedProfile, error: updateError } = await adminClient
    .from("users")
    .update({
      auth_user_id: authUser.id,
      company: metadataValue(metadata.company) ?? metadataValue(metadata.empresa) ?? profileByEmail.company,
      cargo: metadataValue(metadata.cargo) ?? profileByEmail.cargo,
      area: metadataValue(metadata.area) ?? profileByEmail.area,
    })
    .eq("id", profileByEmail.id)
    .select(selectColumns)
    .single<UserProfile>()

  if (updateError) return errorResponse(updateError.message, 500)
  return NextResponse.json({ profile: linkedProfile })
}

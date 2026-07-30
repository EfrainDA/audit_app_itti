import { NextResponse } from "next/server"
import { createServerAdminClient, createServerAuthClient, getBearerToken, getServerSupabaseConfig } from "@/lib/server-auth"
import { consumeRateLimit } from "@/lib/server-rate-limit"
import { getRequestId, logServerEvent } from "@/lib/server-observability"

type UserProfile = {
  id: string
  name: string
  email: string
  role: "admin" | "ceo" | "supervisor" | "auditor" | "auditado"
  status: "activo" | "inactivo"
  avatar: string | null
  company: string | null
  cargo: string | null
  area: string | null
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  })
}

function metadataValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function isSupportedRole(role: UserProfile["role"]) {
  return role === "admin" || role === "ceo" || role === "supervisor" || role === "auditor"
}

// Solo los perfiles previamente provisionados obtienen acceso. Una identidad
// OAuth desconocida queda registrada como inactiva para revisión administrativa.
export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const config = getServerSupabaseConfig()
  if (!config.supabaseServiceRoleKey) {
    return errorResponse("Falta configurar SUPABASE_AUTH_ADMIN_KEY en el servidor.", 500)
  }

  const token = getBearerToken(request)
  if (!token) return errorResponse("No se encontró una sesión válida.", 401)

  const authClient = createServerAuthClient()
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) {
    return errorResponse("La sesión ya no es válida.", 401)
  }

  const adminClient = createServerAdminClient()
  const authUser = authData.user
  const rateLimit = consumeRateLimit(`profile:${authUser.id}`, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta nuevamente más tarde." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    )
  }

  const email = authUser.email ?? ""
  if (!email) return errorResponse("La cuenta autenticada no tiene correo asociado.", 403)

  const selectColumns = "id,name,email,role,status,avatar,company,cargo,area"
  const { data: profileByAuthId, error: authIdError } = await adminClient
    .from("users")
    .select(selectColumns)
    .eq("auth_user_id", authUser.id)
    .maybeSingle<UserProfile>()

  if (authIdError) return errorResponse("No se pudo consultar el perfil.", 500)
  if (profileByAuthId) {
    if (profileByAuthId.status !== "activo") return errorResponse("El usuario no está activo.", 403)
    if (!isSupportedRole(profileByAuthId.role)) return errorResponse("El perfil no tiene un rol habilitado.", 403)
    return NextResponse.json({ profile: profileByAuthId })
  }

  const { data: profileByEmail, error: emailError } = await adminClient
    .from("users")
    .select(selectColumns)
    .ilike("email", email)
    .maybeSingle<UserProfile>()

  if (emailError) return errorResponse("No se pudo consultar el perfil.", 500)
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
        status: "inactivo",
      })
      .select(selectColumns)
      .single<UserProfile>()

    if (insertError) return errorResponse("No se pudo registrar el perfil pendiente.", 500)
    logServerEvent("warn", "inactive_profile_created", {
      requestId,
      authUserId: authUser.id,
      profileId: createdProfile.id,
    })
    return errorResponse(
      `La cuenta ${createdProfile.email} quedó pendiente de activación por un administrador.`,
      403,
    )
  }

  if (profileByEmail.status !== "activo") return errorResponse("El usuario no está activo.", 403)
  if (!isSupportedRole(profileByEmail.role)) return errorResponse("El perfil no tiene un rol habilitado.", 403)

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

  if (updateError) return errorResponse("No se pudo vincular el perfil.", 500)
  return NextResponse.json(
    { profile: linkedProfile },
    { headers: { "Cache-Control": "no-store" } },
  )
}

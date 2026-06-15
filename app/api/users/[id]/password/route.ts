import { NextResponse } from "next/server"
import { createServerAdminClient, readJsonBody, requireAppRole } from "@/lib/server-auth"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function findAuthUserByEmail(
  adminClient: ReturnType<typeof createServerAdminClient>,
  email: string,
) {
  const perPage = 1000

  for (let page = 1; ; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const authUser = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (authUser) return authUser
    if (data.users.length < perPage) return null
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return errorResponse("Falta configurar SUPABASE_SECRET_KEY en el servidor.", 500)
  }
  if (supabaseServiceRoleKey.startsWith("sb_service_role_")) {
    return errorResponse(
      "La clave administrativa no es valida. Usa la Secret key con prefijo sb_secret_ desde Supabase > Settings > API Keys.",
      500,
    )
  }

  const auth = await requireAppRole(request, ["admin"])
  if ("error" in auth) return auth.error

  const body = await readJsonBody<{ password?: unknown }>(request, 4096).catch(() => null)
  const password = typeof body?.password === "string" ? body.password : ""
  if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return errorResponse("La contrasena debe tener al menos 12 caracteres, mayusculas, minusculas y numeros.", 400)
  }
  const adminClient = createServerAdminClient()

  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return errorResponse("Usuario invalido.", 400)
  }

  const { data: profile, error: profileError } = await adminClient
    .from("users")
    .select("auth_user_id,email,name")
    .eq("id", id)
    .maybeSingle()

  if (profileError) return errorResponse(profileError.message, 500)
  if (!profile) return errorResponse("No se encontro el usuario.", 404)

  try {
    let authUserId = profile.auth_user_id as string | null

    if (!authUserId) {
      const existingAuthUser = await findAuthUserByEmail(adminClient, profile.email)

      if (existingAuthUser) {
        authUserId = existingAuthUser.id
        const { error } = await adminClient
          .from("users")
          .update({ auth_user_id: authUserId })
          .eq("id", id)
        if (error) throw error
      } else {
        const { data, error } = await adminClient.auth.admin.createUser({
          email: profile.email,
          password,
          email_confirm: true,
          user_metadata: { name: profile.name },
        })
        if (error) throw error
        authUserId = data.user.id
      }
    }

    const { error } = await adminClient.auth.admin.updateUserById(authUserId, { password })
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo asignar la contrasena."
    return errorResponse(message, 500)
  }
}

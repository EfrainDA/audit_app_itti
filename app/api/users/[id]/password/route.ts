import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function findAuthUserByEmail(
  adminClient: ReturnType<typeof createClient>,
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
    return errorResponse("Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.", 500)
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return errorResponse("No se encontro una sesion valida.", 401)

  const body = (await request.json().catch(() => null)) as { password?: unknown } | null
  const password = typeof body?.password === "string" ? body.password : ""
  if (password.length < 6) {
    return errorResponse("La contrasena debe tener al menos 6 caracteres.", 400)
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: requester, error: requesterError } = await authClient.auth.getUser(token)
  if (requesterError || !requester.user) return errorResponse("La sesion ya no es valida.", 401)

  const { data: adminProfile, error: adminProfileError } = await adminClient
    .from("users")
    .select("role")
    .eq("auth_user_id", requester.user.id)
    .maybeSingle()

  if (adminProfileError) return errorResponse(adminProfileError.message, 500)
  if (adminProfile?.role !== "admin") {
    return errorResponse("Solo admin puede asignar contrasenas.", 403)
  }

  const { id } = await params
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

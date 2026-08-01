import { validatePassword } from "@/lib/domain/password-policy"
import { createServerAdminClient, getServerSupabaseConfig, readJsonBody, requireAppRole } from "@/lib/server-auth"
import { getRequestId, logServerEvent, sendOperationalAlert } from "@/lib/server-observability"
import { consumeRateLimit } from "@/lib/server-rate-limit"
import { NextResponse } from "next/server"

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  })
}

function getAuthAdminErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "No se pudo asignar la contraseña."

  if (/invalid api key/i.test(error.message) || /bad_jwt/i.test(error.message)) {
    return "La clave administrativa de Supabase Auth no es válida. Configura SUPABASE_AUTH_ADMIN_KEY con la clave JWT service_role en .env.local y reinicia el servidor."
  }

  return "No se pudo asignar la contraseña."
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

// Verifica rol e identidad objetivo antes de actualizar la contraseña en Auth.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request)
  const config = getServerSupabaseConfig()
  if (!config.supabaseServiceRoleKey) {
    return errorResponse("Falta configurar SUPABASE_AUTH_ADMIN_KEY en el servidor.", 500)
  }

  const auth = await requireAppRole(request, ["admin"])
  if ("error" in auth) return auth.error

  const rateLimit = consumeRateLimit(`admin-password:${auth.profile.id}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Demasiados cambios de contraseña. Intenta nuevamente más tarde." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    )
  }

  const body = await readJsonBody<{ password?: unknown }>(request, 4096).catch(() => null)
  const password = typeof body?.password === "string" ? body.password : ""
  if (!validatePassword(password).valid) {
    return errorResponse("La contraseña debe tener entre 12 y 128 caracteres, mayúsculas, minúsculas y números.", 400)
  }
  const adminClient = auth.adminClient
  const dbClient = auth.dbClient

  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return errorResponse("Usuario invalido.", 400)
  }

  const { data: profile, error: profileError } = await dbClient
    .from("users")
    .select("auth_user_id,email,name")
    .eq("id", id)
    .maybeSingle()

  if (profileError) return errorResponse("No se pudo consultar el usuario.", 500)
  if (!profile) return errorResponse("No se encontró el usuario.", 404)

  try {
    let authUserId = profile.auth_user_id as string | null

    if (!authUserId) {
      const existingAuthUser = await findAuthUserByEmail(adminClient, profile.email)

      if (existingAuthUser) {
        authUserId = existingAuthUser.id
        const { error } = await dbClient
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
        const { error: linkError } = await dbClient
          .from("users")
          .update({ auth_user_id: authUserId })
          .eq("id", id)
        if (linkError) {
          await adminClient.auth.admin.deleteUser(authUserId)
          throw linkError
        }
      }
    }

    const { data: currentAuthUser, error: getUserError } = await adminClient.auth.admin.getUserById(authUserId)
    if (getUserError) throw getUserError
    const { error } = await adminClient.auth.admin.updateUserById(authUserId, {
      password,
      app_metadata: {
        ...currentAuthUser.user.app_metadata,
        must_change_password: true,
      },
    })
    if (error) throw error

    logServerEvent("info", "admin_password_changed", {
      requestId,
      actorProfileId: auth.profile.id,
      targetProfileId: id,
    })
    await sendOperationalAlert("admin_password_changed", "info", {
      requestId,
      actorProfileId: auth.profile.id,
      targetProfileId: id,
    })
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    logServerEvent("error", "admin_password_change_failed", {
      requestId,
      actorProfileId: auth.profile.id,
      targetProfileId: id,
      error,
    })
    await sendOperationalAlert("admin_password_change_failed", "critical", {
      requestId,
      actorProfileId: auth.profile.id,
      targetProfileId: id,
    })
    return errorResponse(getAuthAdminErrorMessage(error), 500)
  }
}

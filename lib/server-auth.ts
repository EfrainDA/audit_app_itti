import { createClient } from "@supabase/supabase-js"

// Utilidades exclusivas del servidor para autenticar rutas API y validar roles.

type AppRole = "admin" | "ceo" | "supervisor" | "auditor"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey =
  process.env.SUPABASE_AUTH_ADMIN_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_JWT ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  )
}

export function getServerSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Falta configurar Supabase en el servidor.")
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey }
}

// Cliente limitado por RLS que representa al usuario de la petición.
export function createServerAuthClient(accessToken?: string) {
  const config = getServerSupabaseConfig()

  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  })
}

// Cliente privilegiado reservado para operaciones administrativas del backend.
export function createServerAdminClient() {
  const config = getServerSupabaseConfig()
  if (!config.supabaseServiceRoleKey) {
    throw new Error("Falta configurar SUPABASE_AUTH_ADMIN_KEY en el servidor.")
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getBearerToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? ""
}

// Rechaza sesiones inexistentes, perfiles inactivos o roles no autorizados.
export async function requireAppRole(request: Request, allowedRoles: AppRole[]) {
  const token = getBearerToken(request)
  if (!token) return { error: jsonError("No se encontró una sesión válida.", 401) }

  const authClient = createServerAuthClient()
  const dbClient = createServerAuthClient(token)
  const { data: requester, error: requesterError } = await authClient.auth.getUser(token)
  if (requesterError || !requester.user) {
    return { error: jsonError("La sesión ya no es válida.", 401) }
  }

  const { data: profile, error: profileError } = await dbClient
    .from("users")
    .select("id,role,status")
    .eq("auth_user_id", requester.user.id)
    .maybeSingle()

  if (profileError) {
    return { error: jsonError("No se pudo validar el perfil.", 500) }
  }
  if (!profile || profile.status !== "activo") {
    return { error: jsonError("El usuario no está activo.", 403) }
  }
  if (!allowedRoles.includes(profile.role as AppRole)) {
    return { error: jsonError("No tienes permisos para realizar esta acción.", 403) }
  }

  const adminClient = createServerAdminClient()
  return { user: requester.user, profile: profile as { id: string; role: AppRole; status: string }, adminClient, dbClient }
}

export async function readJsonBody<T>(request: Request, maxBytes: number) {
  const contentLength = Number(request.headers.get("content-length") ?? "0")
  if (contentLength > maxBytes) {
    throw new Error(`El cuerpo de la solicitud supera el límite de ${maxBytes} bytes.`)
  }

  const text = await request.text()
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new Error(`El cuerpo de la solicitud supera el límite de ${maxBytes} bytes.`)
  }

  return JSON.parse(text) as T
}

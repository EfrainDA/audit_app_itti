import { createClient } from "@supabase/supabase-js"

type AppRole = "admin" | "supervisor" | "auditor" | "auditado"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export function getServerSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Falta configurar Supabase en el servidor.")
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey }
}

export function createServerAuthClient() {
  const config = getServerSupabaseConfig()

  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function createServerAdminClient() {
  const config = getServerSupabaseConfig()
  if (!config.supabaseServiceRoleKey) {
    throw new Error("Falta configurar SUPABASE_SECRET_KEY en el servidor.")
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getBearerToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? ""
}

export async function requireAppRole(request: Request, allowedRoles: AppRole[]) {
  const token = getBearerToken(request)
  if (!token) return { error: jsonError("No se encontro una sesion valida.", 401) }

  const authClient = createServerAuthClient()
  const adminClient = createServerAdminClient()
  const { data: requester, error: requesterError } = await authClient.auth.getUser(token)
  if (requesterError || !requester.user) {
    return { error: jsonError("La sesion ya no es valida.", 401) }
  }

  const { data: profile, error: profileError } = await adminClient
    .from("users")
    .select("id,role,status")
    .eq("auth_user_id", requester.user.id)
    .maybeSingle()

  if (profileError) return { error: jsonError("No se pudo validar el perfil.", 500) }
  if (!profile || profile.status !== "activo") {
    return { error: jsonError("El usuario no esta activo.", 403) }
  }
  if (!allowedRoles.includes(profile.role as AppRole)) {
    return { error: jsonError("No tenes permisos para realizar esta accion.", 403) }
  }

  return { user: requester.user, profile: profile as { id: string; role: AppRole; status: string }, adminClient }
}

export async function readJsonBody<T>(request: Request, maxBytes: number) {
  const contentLength = Number(request.headers.get("content-length") ?? "0")
  if (contentLength > maxBytes) {
    throw new Error(`El cuerpo de la solicitud supera el limite de ${maxBytes} bytes.`)
  }

  const text = await request.text()
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new Error(`El cuerpo de la solicitud supera el limite de ${maxBytes} bytes.`)
  }

  return JSON.parse(text) as T
}

export const ADMIN_KEY_NAMES = [
  "SUPABASE_AUTH_ADMIN_KEY",
  "SUPABASE_SERVICE_ROLE_JWT",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
]

export function readSupabaseEnvironment(env = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim()
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || env.SUPABASE_PUBLISHABLE_KEY?.trim()
  const adminKeyName = ADMIN_KEY_NAMES.find((name) => env[name]?.trim())
  const adminKey = adminKeyName ? env[adminKeyName]?.trim() : undefined

  return { url, anonKey, adminKey, adminKeyName }
}

export function getSupabaseProjectRef(url) {
  try {
    const hostname = new URL(url).hostname
    return hostname.endsWith(".supabase.co") ? hostname.split(".")[0] : null
  } catch {
    return null
  }
}

import { ADMIN_KEY_NAMES, getSupabaseProjectRef, readSupabaseEnvironment } from "./supabase-env.mjs"

const config = readSupabaseEnvironment()
const missing = []
if (!config.url) missing.push("NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL")
if (!config.anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_PUBLISHABLE_KEY")
if (missing.length) {
  console.error(`Faltan variables obligatorias: ${missing.join(", ")}`)
  process.exitCode = 1
} else {
  let url
  try {
    url = new URL(config.url)
  } catch {
    console.error("NEXT_PUBLIC_SUPABASE_URL no es una URL válida.")
    process.exitCode = 1
  }

  if (url && url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    console.error("Supabase debe usar HTTPS fuera del entorno local.")
    process.exitCode = 1
  }

  const publicRef = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? getSupabaseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL)
    : null
  const serverRef = process.env.SUPABASE_URL
    ? getSupabaseProjectRef(process.env.SUPABASE_URL)
    : null
  if (publicRef && serverRef && publicRef !== serverRef) {
    console.error("NEXT_PUBLIC_SUPABASE_URL y SUPABASE_URL pertenecen a proyectos diferentes.")
    process.exitCode = 1
  }

  if (!config.adminKey) {
    console.warn(`Aviso: no hay clave administrativa (${ADMIN_KEY_NAMES.join(", ")}).`)
  }

  if (!process.exitCode) {
    console.log(`Configuración de entorno válida${config.adminKeyName ? `; admin: ${config.adminKeyName}` : ""}.`)
  }
}

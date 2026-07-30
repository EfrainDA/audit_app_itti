const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]

const missing = required.filter((name) => !process.env[name]?.trim())
if (missing.length) {
  console.error(`Faltan variables obligatorias: ${missing.join(", ")}`)
  process.exitCode = 1
} else {
  let url
  try {
    url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  } catch {
    console.error("NEXT_PUBLIC_SUPABASE_URL no es una URL válida.")
    process.exitCode = 1
  }

  if (url && url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    console.error("Supabase debe usar HTTPS fuera del entorno local.")
    process.exitCode = 1
  }

  if (!process.exitCode) console.log("Configuración de entorno válida.")
}

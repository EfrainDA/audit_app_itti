// Aprovisionamiento inicial idempotente. Requiere service_role y no forma parte
// del arranque normal de la aplicación.
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Administrador"

if (!url || !serviceKey || !email || !password) {
  console.error(
    "Configura NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, "
      + "BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD.",
  )
  process.exit(1)
}

if (
  password.length < 12
  || !/[A-Z]/.test(password)
  || !/[a-z]/.test(password)
  || !/\d/.test(password)
) {
  console.error("La contraseña debe tener 12 caracteres, una mayúscula, una minúscula y un número.")
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: existingProfile, error: profileReadError } = await supabase
  .from("users")
  .select("id,auth_user_id")
  .ilike("email", email)
  .maybeSingle()
if (profileReadError) throw profileReadError

let authUserId = existingProfile?.auth_user_id
if (!authUserId) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })
  if (error) throw error
  authUserId = data.user.id
} else {
  const { error } = await supabase.auth.admin.updateUserById(authUserId, {
    password,
    email_confirm: true,
  })
  if (error) throw error
}

const { error: upsertError } = await supabase.from("users").upsert({
  id: existingProfile?.id,
  auth_user_id: authUserId,
  name,
  email,
  role: "admin",
  status: "activo",
}, { onConflict: "email" })
if (upsertError) throw upsertError

console.log(`Administrador listo: ${email}`)

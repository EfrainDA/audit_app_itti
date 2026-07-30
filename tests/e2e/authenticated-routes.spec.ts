import { expect, type Page, test } from "@playwright/test"

type AppRole = "admin" | "ceo" | "supervisor" | "auditor"

const authUserId = "11111111-1111-4111-8111-111111111111"
const profileId = "22222222-2222-4222-8222-222222222222"
const email = "admin.e2e@example.com"
const password = "ValidPassword123"

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
}

function accessToken() {
  const now = Math.floor(Date.now() / 1000)
  return `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url({
    aud: "authenticated",
    exp: now + 3600,
    iat: now,
    sub: authUserId,
    email,
    role: "authenticated",
  })}.e2e-signature`
}

function authUser() {
  return {
    id: authUserId,
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: new Date().toISOString(),
    phone: "",
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { name: "Admin E2E" },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  }
}

async function mockSupabase(page: Page, options: {
  role?: AppRole
  profileFailures?: number
  profileStatus?: 403 | 429 | 500
} = {}) {
  const token = accessToken()
  let remainingFailures = options.profileFailures ?? 0

  await page.route("https://example.supabase.co/auth/v1/token**", async (route) => {
    const body = route.request().postDataJSON() as { email?: string; password?: string }
    if (body.email !== email || body.password !== password) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: token,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "e2e-refresh-token",
        user: authUser(),
      }),
    })
  })

  await page.route("https://example.supabase.co/auth/v1/user**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(authUser()),
  }))
  await page.route("https://example.supabase.co/auth/v1/logout**", (route) => route.fulfill({
    status: 204,
    body: "",
  }))
  await page.route("https://example.supabase.co/rest/v1/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "Content-Range": "0-0/0" },
    body: "[]",
  }))

  await page.route("**/api/auth/profile", async (route) => {
    if (remainingFailures > 0 || options.profileStatus) {
      if (remainingFailures > 0) remainingFailures -= 1
      const status = options.profileStatus ?? 500
      const messages = {
        403: "El usuario no está activo.",
        429: "Demasiadas solicitudes. Intenta nuevamente más tarde.",
        500: "No se pudo consultar el perfil.",
      }
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ error: messages[status] }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        profile: {
          id: profileId,
          name: "Admin E2E",
          email,
          role: options.role ?? "admin",
          status: "activo",
          avatar: null,
          company: "Qualittyx",
          cargo: null,
          area: null,
        },
      }),
    })
  })
}

async function login(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Correo").fill(email)
  await page.getByLabel("Contraseña").fill(password)
  await page.getByRole("button", { name: "Iniciar Sesión" }).click()
}

test("rechaza credenciales inválidas sin crear una sesión", async ({ page }) => {
  await mockSupabase(page)
  await page.goto("/login")
  await page.getByLabel("Correo").fill("incorrecto@example.com")
  await page.getByLabel("Contraseña").fill("WrongPassword123")
  await page.getByRole("button", { name: "Iniciar Sesión" }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText(/invalid login credentials/i)).toBeVisible()
})

test("inicia sesión, carga el perfil y persiste después de recargar", async ({ page }) => {
  await mockSupabase(page)
  await login(page)

  await expect(page).toHaveURL("/")
  await expect(page.getByRole("link", { name: "Ajustes" }).first()).toBeVisible()
  await page.reload()
  await expect(page.getByRole("link", { name: "Ajustes" }).first()).toBeVisible()
  await expect(page).toHaveURL("/")
})

test("aplica la navegación autorizada para auditor y CEO", async ({ page }) => {
  await mockSupabase(page, { role: "auditor" })
  await login(page)
  await expect(page.getByRole("link", { name: "Planificación" }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "Ajustes" })).toHaveCount(0)

  await page.context().clearCookies()
  await page.evaluate(() => sessionStorage.clear())
  await page.unrouteAll({ behavior: "wait" })
  await mockSupabase(page, { role: "ceo" })
  await page.goto("/login")
  await login(page)
  await expect(page.getByRole("link", { name: "Evaluaciones" }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "Planificación" })).toHaveCount(0)
})

for (const status of [403, 429, 500] as const) {
  test(`muestra y conserva el error de perfil ${status}`, async ({ page }) => {
    await mockSupabase(page, { profileStatus: status })
    await login(page)
    await expect(page.getByRole("heading", { name: "No se pudo cargar tu perfil" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible()
  })
}

test("permite reintentar la carga del perfil después de un error transitorio", async ({ page }) => {
  await mockSupabase(page, { profileFailures: 1 })
  await login(page)
  await expect(page.getByRole("heading", { name: "No se pudo cargar tu perfil" })).toBeVisible()
  await page.getByRole("button", { name: "Reintentar" }).click()
  await expect(page.getByRole("link", { name: "Ajustes" }).first()).toBeVisible()
})

test("cierra la sesión después del periodo configurado fuera de la pestaña", async ({ page }) => {
  await mockSupabase(page)
  await login(page)
  await expect(page.getByRole("link", { name: "Ajustes" }).first()).toBeVisible()

  await page.evaluate(() => {
    sessionStorage.setItem("audit_app_tab_away_started_at", String(Date.now() - 1_000))
    window.dispatchEvent(new Event("focus"))
  })
  await expect(page).toHaveURL(/\/login\?next=%2F$/, { timeout: 5_000 })
})

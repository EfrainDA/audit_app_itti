import { expect, test } from "@playwright/test"

test("health check publica estado sin exponer secretos", async ({ request }) => {
  const response = await request.get("/api/health")
  expect(response.ok()).toBeTruthy()
  expect(response.headers()["cache-control"]).toContain("no-store")
  expect(response.headers()["x-request-id"]).toBeTruthy()

  const body = await response.json()
  expect(body.status).toBe("ok")
  expect(JSON.stringify(body)).not.toContain("test-anon-key")
})

test("el inicio de sesión es accesible y las rutas privadas no muestran datos sin sesión", async ({ page }) => {
  await page.goto("/login")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible()

  await page.goto("/planificacion")
  await expect(page).toHaveURL(/\/login\?next=%2Fplanificacion$/)
})

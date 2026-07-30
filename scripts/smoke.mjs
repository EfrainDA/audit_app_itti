const baseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000"
const response = await fetch(new URL("/api/health", baseUrl), {
  headers: { "X-Smoke-Test": "true" },
})
const body = await response.json().catch(() => null)

if (!response.ok || body?.status !== "ok") {
  console.error(`Smoke test fallido (${response.status}): ${JSON.stringify(body)}`)
  process.exitCode = 1
} else {
  console.log(`Smoke test correcto: ${baseUrl}`)
}

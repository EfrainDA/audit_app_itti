// Readiness profundo: verifica configuración privilegiada y conectividad real
// con PostgreSQL antes de declarar que la instancia puede recibir tráfico.
import { NextResponse } from "next/server"
import { createServerAdminClient, getServerSupabaseConfig } from "@/lib/server-auth"
import {
  getRequestId,
  logServerEvent,
  withRequestId,
} from "@/lib/server-observability"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const requestId = getRequestId(request)
  const startedAt = performance.now()

  try {
    const config = getServerSupabaseConfig()
    if (!config.supabaseServiceRoleKey) throw new Error("Service role not configured")

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3_000)
    const { error } = await createServerAdminClient()
      .from("thresholds")
      .select("id", { head: true, count: "exact" })
      .limit(1)
      .abortSignal(controller.signal)
    clearTimeout(timeout)
    if (error) throw error

    const durationMs = Math.round(performance.now() - startedAt)
    logServerEvent("info", "readiness_check", { requestId, durationMs })
    return withRequestId(
      NextResponse.json(
        { status: "ready", timestamp: new Date().toISOString(), durationMs },
        { headers: { "Cache-Control": "no-store" } },
      ),
      requestId,
    )
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt)
    logServerEvent("error", "readiness_check_failed", {
      requestId,
      durationMs,
      error,
    })
    return withRequestId(
      NextResponse.json(
        { status: "not_ready", timestamp: new Date().toISOString(), durationMs },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      ),
      requestId,
    )
  }
}

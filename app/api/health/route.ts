import { NextResponse } from "next/server"
import { getRequestId, withRequestId } from "@/lib/server-observability"

export const dynamic = "force-dynamic"

export function GET(request: Request) {
  const requestId = getRequestId(request)
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
      && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  return withRequestId(
    NextResponse.json(
      {
        status: configured ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        checks: { configuration: configured },
      },
      {
        status: configured ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    ),
    requestId,
  )
}

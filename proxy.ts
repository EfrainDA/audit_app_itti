import { NextResponse, type NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id")?.slice(0, 128) || crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-request-id", requestId)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set("X-Request-Id", requestId)
  return response
}

export const config = {
  matcher: ["/api/:path*"],
}

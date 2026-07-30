import "server-only"

// Registro estructurado y correlación de solicitudes para endpoints del servidor.
type LogLevel = "info" | "warn" | "error"

type LogContext = Record<string, unknown>

function serializeError(error: unknown) {
  if (!(error instanceof Error)) return error
  return {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  }
}

export function getRequestId(request: Request) {
  return request.headers.get("x-request-id")?.slice(0, 128) || crypto.randomUUID()
}

export function logServerEvent(
  level: LogLevel,
  event: string,
  context: LogContext = {},
) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
    error: context.error ? serializeError(context.error) : undefined,
  })

  if (level === "error") console.error(payload)
  else if (level === "warn") console.warn(payload)
  else console.info(payload)
}

export function withRequestId(response: Response, requestId: string) {
  response.headers.set("X-Request-Id", requestId)
  return response
}

import "server-only"

// Registro estructurado y correlación de solicitudes para endpoints del servidor.
type LogLevel = "info" | "warn" | "error"

type LogContext = Record<string, unknown>
type AlertSeverity = "info" | "warning" | "critical"

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

// Envía alertas operativas a un webhook sin bloquear indefinidamente una
// función serverless. El receptor puede ser Slack, Teams, Make, Zapier o un
// servicio de incidentes que acepte JSON.
export async function sendOperationalAlert(
  event: string,
  severity: AlertSeverity,
  context: LogContext = {},
) {
  const webhookUrl = process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim()
  if (!webhookUrl) return false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2_000)
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(process.env.OPERATIONS_ALERT_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.OPERATIONS_ALERT_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        application: "qualittyx",
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
        timestamp: new Date().toISOString(),
        severity,
        event,
        ...context,
      }),
    })
    if (!response.ok) throw new Error(`Alert webhook responded ${response.status}`)
    return true
  } catch (error) {
    logServerEvent("error", "operational_alert_delivery_failed", { event, error })
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>
    const parts = [record.message, record.details, record.hint, record.code]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)

    if (parts.length) return parts.join(" ")
  }

  if (typeof error === "string" && error.trim()) return error

  return fallback
}

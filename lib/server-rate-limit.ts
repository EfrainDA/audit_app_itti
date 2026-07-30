// Limitador en memoria para proteger rutas administrativas dentro de una
// instancia. Un despliegue distribuido debe usar un almacén compartido.
type RateLimitEntry = {
  count: number
  resetAt: number
}

const entries = new Map<string, RateLimitEntry>()
const MAX_ENTRIES = 10_000

function removeExpiredEntries(now: number) {
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key)
  }
}

export function consumeRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now()
  const current = entries.get(key)

  if (!current || current.resetAt <= now) {
    if (entries.size >= MAX_ENTRIES) removeExpiredEntries(now)
    if (entries.size >= MAX_ENTRIES) {
      const oldestKey = entries.keys().next().value
      if (oldestKey) entries.delete(oldestKey)
    }
    entries.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}

export function clearRateLimits() {
  entries.clear()
}

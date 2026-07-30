import { afterEach, describe, expect, it, vi } from "vitest"
import { clearRateLimits, consumeRateLimit } from "./server-rate-limit"

describe("consumeRateLimit", () => {
  afterEach(() => {
    clearRateLimits()
    vi.useRealTimers()
  })

  it("permite solicitudes dentro del límite y bloquea el exceso", () => {
    const key = `test-limit-${crypto.randomUUID()}`

    expect(consumeRateLimit(key, { limit: 2, windowMs: 60_000 }).allowed).toBe(true)
    expect(consumeRateLimit(key, { limit: 2, windowMs: 60_000 }).allowed).toBe(true)

    const blocked = consumeRateLimit(key, { limit: 2, windowMs: 60_000 })
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("aisla los contadores por clave", () => {
    consumeRateLimit("first", { limit: 1, windowMs: 60_000 })

    expect(consumeRateLimit("first", { limit: 1, windowMs: 60_000 }).allowed).toBe(false)
    expect(consumeRateLimit("second", { limit: 1, windowMs: 60_000 }).allowed).toBe(true)
  })

  it("reinicia la ventana cuando expira", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-30T12:00:00Z"))

    expect(consumeRateLimit("expiring", { limit: 1, windowMs: 1_000 }).allowed).toBe(true)
    expect(consumeRateLimit("expiring", { limit: 1, windowMs: 1_000 }).allowed).toBe(false)

    vi.advanceTimersByTime(1_001)
    expect(consumeRateLimit("expiring", { limit: 1, windowMs: 1_000 }).allowed).toBe(true)
  })
})

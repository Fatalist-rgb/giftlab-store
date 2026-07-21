/**
 * Tiny in-memory rate limiter for abuse-prone store endpoints (upload signing costs
 * R2 operations; reviews invite spam). Per-key sliding window; per-instance state is
 * fine at this scale — it only needs to blunt scripted abuse, not be perfect.
 */
const buckets = new Map<string, number[]>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  // opportunistic cleanup so the map cannot grow unbounded
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k)
  }
  return true
}

export function clientIp(req: { headers: Record<string, unknown> }): string {
  const fwd = req.headers['x-forwarded-for']
  const first = Array.isArray(fwd) ? fwd[0] : typeof fwd === 'string' ? fwd.split(',')[0] : ''
  return (first || 'unknown').trim()
}

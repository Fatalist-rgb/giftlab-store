const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Omnibus lowest price (FR-039): the lowest price that was IN EFFECT during the
 * `days`-day window ending at `asOf`. That is every entry effective within the window
 * plus the entry carried over from just before it (a price set earlier still applies
 * until the next change). Returns null when there is no history. Pure and testable.
 */
export function lowestPriceInPreviousDays(
  entries: Array<{ price: number; effective_from: Date | string }>,
  asOf: Date,
  days = 30,
): number | null {
  const windowStart = new Date(asOf.getTime() - days * DAY_MS)
  const sorted = entries
    .map((e) => ({ price: e.price, at: new Date(e.effective_from) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime())

  const inWindow = sorted.filter((e) => e.at >= windowStart && e.at <= asOf)
  const carriedOver = [...sorted].reverse().find((e) => e.at < windowStart)

  const prices = inWindow.map((e) => e.price)
  if (carriedOver) prices.push(carriedOver.price)
  return prices.length ? Math.min(...prices) : null
}

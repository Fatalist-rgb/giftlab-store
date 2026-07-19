import { lowestPriceInPreviousDays } from '../pricing'

const jan = (d: number) => new Date(2026, 0, d) // Jan d, 2026

describe('price_history — Omnibus lowest price (FR-039)', () => {
  it('returns null with no history', () => {
    expect(lowestPriceInPreviousDays([], jan(31))).toBeNull()
  })

  it('is the minimum of prices in effect during the 30-day window', () => {
    const entries = [
      { price: 7900, effective_from: jan(1) },
      { price: 6500, effective_from: jan(10) }, // a dip
      { price: 7900, effective_from: jan(20) },
    ]
    // asOf Jan 31 -> window Jan 1..31 -> min is 6500
    expect(lowestPriceInPreviousDays(entries, jan(31))).toBe(6500)
  })

  it('includes the price carried over from before the window', () => {
    const entries = [
      { price: 4900, effective_from: jan(1) }, // long-standing low price
      { price: 7900, effective_from: jan(25) }, // raised inside window
    ]
    // asOf Feb 20 -> window Jan 21..Feb 20; carry-over at window start = 4900
    expect(lowestPriceInPreviousDays(entries, new Date(2026, 1, 20))).toBe(4900)
  })

  it('ignores prices that fell out of the window', () => {
    const entries = [
      { price: 3000, effective_from: jan(1) }, // very old low, before window
      { price: 6500, effective_from: jan(10) }, // still before window
      { price: 7900, effective_from: jan(15) }, // carry-over into window
    ]
    // asOf Mar 1 -> window Jan 30..Mar 1; last-before-window = 7900. Jan1/Jan10 excluded.
    expect(lowestPriceInPreviousDays(entries, new Date(2026, 2, 1))).toBe(7900)
  })
})

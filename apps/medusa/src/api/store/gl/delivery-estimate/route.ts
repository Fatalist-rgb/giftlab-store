import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

/**
 * GET /store/gl/delivery-estimate — the promised DATE WINDOW with production folded in
 * (FR-018 / T038): made-to-order production + courier transit, skipping weekends. The
 * spans are env-configurable placeholders until the client confirms real production
 * capacity and carriers; the shape of the promise (a window, not a lie like "tomorrow")
 * stays the same.
 */
const PRODUCTION_DAYS_MIN = Number(process.env.GL_PRODUCTION_DAYS_MIN ?? 2)
const PRODUCTION_DAYS_MAX = Number(process.env.GL_PRODUCTION_DAYS_MAX ?? 4)
const SHIPPING_DAYS_MIN = Number(process.env.GL_SHIPPING_DAYS_MIN ?? 1)
const SHIPPING_DAYS_MAX = Number(process.env.GL_SHIPPING_DAYS_MAX ?? 2)

/** Add N business days (Mon-Fri) to a date. */
function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from)
  let left = days
  while (left > 0) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) left -= 1
  }
  return d
}

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const now = new Date()
  const from = addBusinessDays(now, PRODUCTION_DAYS_MIN + SHIPPING_DAYS_MIN)
  const to = addBusinessDays(now, PRODUCTION_DAYS_MAX + SHIPPING_DAYS_MAX)

  res.json({
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    productionDays: { min: PRODUCTION_DAYS_MIN, max: PRODUCTION_DAYS_MAX },
    shippingDays: { min: SHIPPING_DAYS_MIN, max: SHIPPING_DAYS_MAX },
  })
}

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { IOrderModuleService, IProductModuleService } from '@medusajs/framework/types'
import { REVIEW_MODULE } from '../../../../modules/review'
import type ReviewModuleService from '../../../../modules/review/service'
import { PERSONALIZATION_MODULE } from '../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../modules/personalization/service'

async function resolveProductId(scope: MedusaRequest['scope'], idOrHandle: string): Promise<string | null> {
  const products: IProductModuleService = scope.resolve(Modules.PRODUCT)
  const [byId] = await products.listProducts({ id: idOrHandle }, { take: 1 })
  if (byId) return byId.id
  const [byHandle] = await products.listProducts({ handle: idOrHandle }, { take: 1 })
  return byHandle?.id ?? null
}

/**
 * GET /store/gl/reviews?productId=… — published reviews + the summary the PDP shows.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const idOrHandle = String(req.query.productId ?? '')
  if (!idOrHandle) return res.status(400).json({ message: 'productId is required' })
  const productId = await resolveProductId(req.scope, idOrHandle)
  if (!productId) return res.status(404).json({ message: 'product not found' })

  const reviews: ReviewModuleService = req.scope.resolve(REVIEW_MODULE)
  const [list, summary] = await Promise.all([
    reviews.publishedFor(productId),
    reviews.summaryFor(productId),
  ])

  res.json({
    summary,
    reviews: list.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      author: r.author_name,
      verifiedBuyer: r.verified_buyer,
      locale: r.locale,
      publishedAt: r.published_at,
    })),
  })
}

/**
 * POST /store/gl/reviews — submit a review (lands as pending, FR-038). Verified-buyer
 * is DERIVED, never declared: the claimed order number must exist, carry the same
 * email and contain this product. Body: { productId, rating, body, authorName, email?,
 * orderDisplayId?, locale? }.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as {
    productId?: string
    rating?: number
    body?: string
    authorName?: string
    email?: string
    orderDisplayId?: number
    locale?: 'pl' | 'en' | 'uk'
  }
  if (!body.productId || !body.rating || !body.body || !body.authorName) {
    return res.status(400).json({ message: 'productId, rating, body and authorName are required' })
  }
  const productId = await resolveProductId(req.scope, body.productId)
  if (!productId) return res.status(404).json({ message: 'product not found' })

  // verified-buyer derivation (order number + email + product must all match).
  // The order module's display_id filter is unreliable at runtime, so the number is
  // resolved through our own order_line_design rows (denormalized at freeze time).
  let verified = false
  if (body.orderDisplayId && body.email) {
    try {
      const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)
      const [lineRow] = await personalization.listOrderLineDesigns(
        { order_display_id: body.orderDisplayId },
        { take: 1 },
      )
      if (lineRow?.order_id) {
        const orders: IOrderModuleService = req.scope.resolve(Modules.ORDER)
        const order = await orders.retrieveOrder(lineRow.order_id, { relations: ['items'] })
        const emailMatches = order?.email?.toLowerCase() === body.email.trim().toLowerCase()
        const hasProduct = (order?.items ?? []).some(
          (i) => (i as unknown as { product_id?: string | null }).product_id === productId,
        )
        verified = Boolean(order && emailMatches && hasProduct)
      }
    } catch {
      verified = false
    }
  }

  const reviews: ReviewModuleService = req.scope.resolve(REVIEW_MODULE)
  try {
    const row = await reviews.submit({
      medusa_product_id: productId,
      rating: Number(body.rating),
      body: String(body.body),
      author_name: String(body.authorName),
      locale: body.locale && ['pl', 'en', 'uk'].includes(body.locale) ? body.locale : 'pl',
      verified_buyer: verified,
      order_display_id: body.orderDisplayId ?? null,
    })
    res.status(201).json({ ok: true, reviewId: row.id, verifiedBuyer: verified, status: row.status })
  } catch (e) {
    res.status(422).json({ message: (e as Error).message })
  }
}

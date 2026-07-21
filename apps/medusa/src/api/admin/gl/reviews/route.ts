import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { REVIEW_MODULE } from '../../../../modules/review'
import type ReviewModuleService from '../../../../modules/review/service'

/** GET /admin/gl/reviews?status=pending — the moderation queue (newest first). */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const status = ['pending', 'published', 'rejected'].includes(String(req.query.status))
    ? (String(req.query.status) as 'pending' | 'published' | 'rejected')
    : 'pending'
  const reviews: ReviewModuleService = req.scope.resolve(REVIEW_MODULE)
  const rows = await reviews.listReviews({ status }, { order: { created_at: 'DESC' }, take: 200 })
  res.json({
    count: rows.length,
    reviews: rows.map((r) => ({
      id: r.id,
      productId: r.medusa_product_id,
      rating: r.rating,
      body: r.body,
      author: r.author_name,
      verifiedBuyer: r.verified_buyer,
      orderDisplayId: r.order_display_id,
      createdAt: r.created_at,
    })),
  })
}

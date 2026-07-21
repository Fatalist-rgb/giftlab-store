import { MedusaService } from '@medusajs/framework/utils'
import Review from './models/review'

export type ReviewLocale = 'pl' | 'en' | 'uk'

export interface ReviewSummary {
  count: number
  average: number | null
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

/**
 * Reviews with moderation (T066). Submissions land as `pending`; the operator
 * publishes or rejects them. Published rows drive the storefront list + summary.
 */
class ReviewModuleService extends MedusaService({ Review }) {
  async submit(input: {
    medusa_product_id: string
    rating: number
    body: string
    author_name: string
    locale?: ReviewLocale
    verified_buyer: boolean
    order_display_id?: number | null
  }) {
    const rating = Math.round(input.rating)
    if (rating < 1 || rating > 5) throw new Error('rating must be between 1 and 5')
    const body = input.body.trim()
    if (body.length < 3 || body.length > 2000) throw new Error('review body must be 3-2000 chars')
    const author = input.author_name.trim().slice(0, 80)
    if (!author) throw new Error('author name is required')

    const [review] = await this.createReviews([
      {
        medusa_product_id: input.medusa_product_id,
        rating,
        body,
        author_name: author,
        locale: input.locale ?? 'pl',
        verified_buyer: input.verified_buyer,
        order_display_id: input.order_display_id ?? null,
        status: 'pending',
      },
    ])
    return review
  }

  async publishedFor(productId: string) {
    return this.listReviews(
      { medusa_product_id: productId, status: 'published' },
      { order: { published_at: 'DESC' }, take: 100 },
    )
  }

  async summaryFor(productId: string): Promise<ReviewSummary> {
    const rows = await this.listReviews(
      { medusa_product_id: productId, status: 'published' },
      { select: ['rating'], take: 10_000 },
    )
    const distribution: ReviewSummary['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let sum = 0
    for (const r of rows) {
      const k = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5
      distribution[k] += 1
      sum += r.rating
    }
    return {
      count: rows.length,
      average: rows.length ? Math.round((sum / rows.length) * 10) / 10 : null,
      distribution,
    }
  }

  async moderate(id: string, decision: 'published' | 'rejected') {
    const [row] = await this.updateReviews([
      { id, status: decision, published_at: decision === 'published' ? new Date() : null },
    ])
    return row
  }
}

export default ReviewModuleService

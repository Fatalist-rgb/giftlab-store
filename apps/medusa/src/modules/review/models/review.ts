import { model } from '@medusajs/framework/utils'

/**
 * A product review (T066). Moderated: submissions start as `pending` and only
 * `published` rows reach the storefront. `verified_buyer` is DERIVED at submission
 * (order number + email + product match) — never self-declared; the storefront must
 * also disclose how verification works (Omnibus).
 */
const Review = model.define('review', {
  id: model.id().primaryKey(),
  medusa_product_id: model.text().index(),
  rating: model.number(), // 1..5, validated at the boundary
  body: model.text(),
  author_name: model.text(),
  locale: model.enum(['pl', 'en', 'uk']).default('pl'),
  photo_key: model.text().nullable(),
  verified_buyer: model.boolean().default(false),
  order_display_id: model.number().nullable(), // what the reviewer claimed (audit)
  status: model.enum(['pending', 'published', 'rejected']).default('pending'),
  published_at: model.dateTime().nullable(),
})

export default Review

import { model } from '@medusajs/framework/utils'

/**
 * The @gl/constructor ProductSchema for a Medusa product — the definition of how
 * the item is customized (character layers, face zone, text fields, options) and
 * priced. Stored as validated JSON and versioned; at most one row per product is
 * active (status = "published").
 *
 * Authoritative validation is @gl/constructor.parseProductSchema, run on the
 * storefront / publish edge. This module re-checks the free-default legal
 * invariant at publish as a storage-boundary safety net (see service.publishSchema).
 */
const ProductSchema = model.define('product_schema', {
  id: model.id().primaryKey(),
  // Medusa product this schema customizes (Product.id).
  product_id: model.text().index(),
  version: model.number().default(1),
  status: model.enum(['draft', 'published', 'archived']).default('draft'),
  // the @gl/constructor ProductSchema, as validated JSON
  definition: model.json(),
  published_at: model.dateTime().nullable(),
})

export default ProductSchema

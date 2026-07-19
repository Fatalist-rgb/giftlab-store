import { model } from '@medusajs/framework/utils'

/**
 * A point in a product/variant's price timeline. Recording every change from day one
 * is what makes the Omnibus "lowest price in the previous 30 days" computable the
 * moment any reduction is later displayed (FR-039). Cheap now; impossible retroactively.
 */
const PriceEntry = model.define('price_entry', {
  id: model.id().primaryKey(),
  medusa_product_id: model.text().index(),
  // price scope: single product today, retained for future per-variant pricing
  variant_key: model.text().default('default'),
  price: model.number(), // minor units (grosz)
  effective_from: model.dateTime(),
})

export default PriceEntry

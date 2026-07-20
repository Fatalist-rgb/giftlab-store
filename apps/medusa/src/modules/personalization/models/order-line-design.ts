import { model } from '@medusajs/framework/utils'

/**
 * Per-line manufacturing + legal snapshot extending a Medusa order line item
 * (one row per figurine). Frozen at purchase: the design + schema version for
 * reproducibility (Principle II), and the withdrawal-right verdict plus the notice
 * version the buyer actually saw (FR-029 / FR-030 — the seller must be able to prove it).
 */
const OrderLineDesign = model.define('order_line_design', {
  id: model.id().primaryKey(),
  medusa_line_item_id: model.text().unique(),
  // denormalized at freeze time so admin surfaces need no cross-module joins
  order_id: model.text().index().nullable(),
  order_display_id: model.number().nullable(),
  design_state_id: model.text().index(),
  schema_version: model.number(),
  production_package_id: model.text().nullable(),
  render_status: model
    .enum(['queued', 'processing', 'ready', 'failed', 'awaiting_photo'])
    .default('queued'),
  // computed per line at purchase, never recomputed afterwards
  withdrawal_right: model.enum(['excluded', 'applies']),
  withdrawal_notice_version: model.text().nullable(),
})

export default OrderLineDesign

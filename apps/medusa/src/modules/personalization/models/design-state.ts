import { model } from '@medusajs/framework/utils'

/**
 * One customer's configuration against one published ProductSchema version (FR-022).
 * A cart/order may hold many design states (bulk: many designs, one order — FR-012).
 * `computed_price` is server-authoritative (grosz); the client value is advisory.
 */
const DesignState = model.define('design_state', {
  id: model.id().primaryKey(),
  product_schema_id: model.text().index(),
  schema_version: model.number(),
  character_selections: model.json(), // { layer_id: variant_id }
  face_layer: model.json().nullable(), // { uploaded_photo_id, x, y, scale, rotation }
  text_values: model.json().nullable(), // [{ field_id, value, font, color }]
  selected_options: model.json().nullable(), // { option_id: value } (empty for this product)
  quantity: model.number().default(1), // units of this design (the ladder keys off the order total)
  photo_status: model.enum(['ready', 'deferred', 'processing', 'failed']).default('deferred'),
  computed_price: model.number(), // minor units (grosz)
  is_personalized: model.boolean().default(false), // derived; drives per-line withdrawal right
})

export default DesignState

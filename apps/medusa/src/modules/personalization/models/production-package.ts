import { model } from '@medusajs/framework/utils'

/**
 * The manufacturing output for one order line: the 300 DPI print raster, a PDF with
 * the CutContour spot, the vector cut path, a parameter spec and a customer preview.
 * Only R2 keys are stored. `render_engine_version` makes a package reproducible.
 */
const ProductionPackage = model.define('production_package', {
  id: model.id().primaryKey(),
  order_line_id: model.text().index(), // medusa line item id
  status: model
    .enum(['queued', 'processing', 'ready', 'failed', 'awaiting_photo'])
    .default('queued'),
  print_png_key: model.text().nullable(),
  print_pdf_key: model.text().nullable(),
  cut_svg_key: model.text().nullable(),
  spec_json_key: model.text().nullable(),
  preview_key: model.text().nullable(),
  dpi: model.number().default(300),
  render_engine_version: model.text().nullable(),
})

export default ProductionPackage

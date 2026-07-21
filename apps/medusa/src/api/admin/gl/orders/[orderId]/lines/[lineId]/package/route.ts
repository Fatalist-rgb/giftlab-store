import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PERSONALIZATION_MODULE } from '../../../../../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../../../../../modules/personalization/service'
import { presignGet, r2Configured } from '../../../../../../../../lib/r2'

/**
 * GET /admin/gl/orders/:orderId/lines/:lineId/package — operator download of the
 * production package (T054): short-lived signed R2 URLs for the print raster, cut
 * contour, preview and spec. 409 while the package is not ready.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { orderId, lineId } = req.params
  if (!r2Configured()) {
    return res.status(503).json({ message: 'package storage is not configured' })
  }

  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)
  const [line] = await personalization.listOrderLineDesigns({ medusa_line_item_id: lineId })
  if (!line) return res.status(404).json({ message: 'no design frozen on this line' })
  if (line.order_id && line.order_id !== orderId) {
    return res.status(404).json({ message: 'line does not belong to this order' })
  }
  if (line.render_status !== 'ready' || !line.production_package_id) {
    return res.status(409).json({ message: `package not ready (render ${line.render_status})` })
  }

  const pkg = await personalization.retrieveProductionPackage(line.production_package_id)
  const short = lineId.slice(-8)
  const sign = (key: string | null, name: string) =>
    key ? presignGet(key, 900, name) : Promise.resolve(null)

  const [printPng, cutSvg, previewPng, specJson] = await Promise.all([
    sign(pkg.print_png_key, `print-${short}.png`),
    sign(pkg.cut_svg_key, `cut-${short}.svg`),
    sign(pkg.preview_key, `preview-${short}.png`),
    sign(pkg.spec_json_key, `spec-${short}.json`),
  ])

  res.json({
    lineItemId: lineId,
    dpi: pkg.dpi,
    engineVersion: pkg.render_engine_version,
    expiresInSeconds: 900,
    urls: { printPng, cutSvg, previewPng, specJson },
  })
}

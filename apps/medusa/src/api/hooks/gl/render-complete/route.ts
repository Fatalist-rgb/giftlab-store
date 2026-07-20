import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PERSONALIZATION_MODULE } from '../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../modules/personalization/service'

/**
 * POST /hooks/gl/render-complete — the render worker reports a finished production
 * package. Guarded by a shared token (RENDER_HOOK_TOKEN); records the ProductionPackage
 * row (R2 keys + engine version) and flips the order line to render_status=ready —
 * the moment the admin sees "file ready for print" (SC-002).
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const expected = process.env.RENDER_HOOK_TOKEN
  if (!expected || req.headers['x-gl-render-token'] !== expected) {
    return res.status(401).json({ message: 'bad token' })
  }

  const body = (req.body ?? {}) as {
    lineItemId?: string
    keys?: { printPng?: string; cutSvg?: string; previewPng?: string; specJson?: string }
    meta?: { dpi?: number; widthPx?: number; heightPx?: number }
    engineVersion?: string
  }
  if (!body.lineItemId || !body.keys?.printPng) {
    return res.status(400).json({ message: 'lineItemId and keys.printPng are required' })
  }

  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)

  const [line] = await personalization.listOrderLineDesigns({ medusa_line_item_id: body.lineItemId })
  if (!line) {
    return res.status(404).json({ message: `no order line design for ${body.lineItemId}` })
  }

  const [pkg] = await personalization.createProductionPackages([
    {
      order_line_id: body.lineItemId,
      status: 'ready',
      print_png_key: body.keys.printPng,
      cut_svg_key: body.keys.cutSvg ?? null,
      preview_key: body.keys.previewPng ?? null,
      spec_json_key: body.keys.specJson ?? null,
      dpi: body.meta?.dpi ?? 300,
      render_engine_version: body.engineVersion ?? null,
    },
  ])

  await personalization.updateOrderLineDesigns([
    { id: line.id, render_status: 'ready', production_package_id: pkg.id },
  ])

  res.json({ ok: true, packageId: pkg.id })
}

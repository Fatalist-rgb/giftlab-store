import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { IOrderModuleService } from '@medusajs/framework/types'
import { PERSONALIZATION_MODULE } from '../../../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../../../modules/personalization/service'

/**
 * GET /admin/gl/orders/:orderId/design — the manufacturing view of an order (T055):
 * per line the frozen design (variant, name, quantity), the per-line withdrawal right,
 * the render status and the production package keys. Admin-authenticated by default.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { orderId } = req.params
  const orders: IOrderModuleService = req.scope.resolve(Modules.ORDER)
  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)

  let order
  try {
    order = await orders.retrieveOrder(orderId, { relations: ['items'] })
  } catch {
    return res.status(404).json({ message: `order not found: ${orderId}` })
  }

  const lines: Array<Record<string, unknown>> = []
  for (const item of order.items ?? []) {
    const [line] = await personalization.listOrderLineDesigns({ medusa_line_item_id: item.id })
    if (!line) continue

    let design: Record<string, unknown> | null = null
    try {
      const d = await personalization.retrieveDesignState(line.design_state_id)
      design = {
        characterSelections: d.character_selections,
        textValues: d.text_values,
        quantity: d.quantity,
        photoStatus: d.photo_status,
        isPersonalized: d.is_personalized,
      }
    } catch {
      design = null
    }

    let pkg: Record<string, unknown> | null = null
    if (line.production_package_id) {
      try {
        const p = await personalization.retrieveProductionPackage(line.production_package_id)
        pkg = {
          status: p.status,
          printPngKey: p.print_png_key,
          cutSvgKey: p.cut_svg_key,
          previewKey: p.preview_key,
          specJsonKey: p.spec_json_key,
          dpi: p.dpi,
        }
      } catch {
        pkg = null
      }
    }

    lines.push({
      lineItemId: item.id,
      title: item.title,
      quantity: item.quantity,
      schemaVersion: line.schema_version,
      withdrawalRight: line.withdrawal_right,
      withdrawalNoticeVersion: line.withdrawal_notice_version,
      renderStatus: line.render_status,
      design,
      package: pkg,
    })
  }

  res.json({ orderId: order.id, displayId: order.display_id ?? null, lines })
}

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { IOrderModuleService } from '@medusajs/framework/types'
import { PERSONALIZATION_MODULE } from '../../../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../../../modules/personalization/service'

/**
 * GET /store/gl/orders/:orderId/status — the customer's view of their order: per line
 * the render state and whether the line still WAITS FOR A PHOTO (the "order now, send
 * the photo later" flow completes on this page). Order ids are unguessable ULIDs; a
 * signed email link tightens this further once real mail lands.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { orderId } = req.params
  const orders: IOrderModuleService = req.scope.resolve(Modules.ORDER)
  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)

  let order
  try {
    order = await orders.retrieveOrder(orderId, { relations: ['items'] })
  } catch {
    return res.status(404).json({ message: 'order not found' })
  }

  const lines: Array<Record<string, unknown>> = []
  for (const item of order.items ?? []) {
    const [line] = await personalization.listOrderLineDesigns({ medusa_line_item_id: item.id })
    lines.push({
      lineItemId: item.id,
      title: item.title,
      quantity: item.quantity,
      renderStatus: line?.render_status ?? null,
      needsPhoto: line?.render_status === 'awaiting_photo',
    })
  }

  res.json({
    orderId: order.id,
    displayId: order.display_id ?? null,
    createdAt: order.created_at,
    lines,
  })
}

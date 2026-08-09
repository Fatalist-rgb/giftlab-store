import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { IOrderModuleService } from '@medusajs/framework/types'
import { PERSONALIZATION_MODULE } from '../../../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../../../modules/personalization/service'

/**
 * GET /store/gl/orders/:orderId/status — the customer's view of their order.
 *
 * This payload feeds the "thank you" page, so it is a RECEIPT, not just a status list:
 * per line the render state, whether the line still waits for a photo, plus what was
 * configured (pose, printed name) and what was charged. Totals come from the order —
 * never recomputed here, an order is immutable. Order ids are unguessable ULIDs; a
 * signed email link tightens this further once real mail lands.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { orderId } = req.params
  const orders: IOrderModuleService = req.scope.resolve(Modules.ORDER)
  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)

  let order
  try {
    order = await orders.retrieveOrder(orderId, {
      relations: ['items', 'shipping_methods'],
    })
  } catch {
    return res.status(404).json({ message: 'order not found' })
  }

  const lines: Array<Record<string, unknown>> = []
  for (const item of order.items ?? []) {
    const [line] = await personalization.listOrderLineDesigns({ medusa_line_item_id: item.id })
    const meta = (item.metadata ?? {}) as Record<string, unknown>
    const unitPrice = Number(item.unit_price ?? 0)
    lines.push({
      lineItemId: item.id,
      title: item.title,
      quantity: item.quantity,
      unitPrice,
      total: unitPrice * Number(item.quantity ?? 1),
      pose: (meta.gl_pose as string | undefined) ?? null,
      printedName: (meta.gl_name as string | undefined) ?? null,
      personalized: Boolean(meta.design_id),
      renderStatus: line?.render_status ?? null,
      needsPhoto: line?.render_status === 'awaiting_photo',
    })
  }

  const ship = (order.shipping_methods ?? [])[0]

  res.json({
    orderId: order.id,
    displayId: order.display_id ?? null,
    createdAt: order.created_at,
    email: order.email ?? null,
    currency: order.currency_code ?? 'pln',
    itemTotal: Number(order.item_total ?? 0),
    shippingTotal: Number(order.shipping_total ?? 0),
    total: Number(order.total ?? 0),
    shippingName: ship?.name ?? null,
    lines,
  })
}

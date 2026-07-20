import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { IOrderModuleService } from '@medusajs/framework/types'
import { PERSONALIZATION_MODULE } from '../../../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../../../modules/personalization/service'
import { enqueueRenderForLine } from '../../../../../../lib/render-jobs'

/**
 * POST /admin/gl/lines/:lineItemId/requeue — operator action for failed/stuck lines
 * (T056): flips the line back to queued and re-enqueues the render job through the
 * same shared path the order subscriber uses. Refuses awaiting_photo (that is the
 * customer's photo-attach flow) and already-ready lines.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { lineItemId } = req.params
  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)

  const [line] = await personalization.listOrderLineDesigns({ medusa_line_item_id: lineItemId })
  if (!line) return res.status(404).json({ message: 'no design frozen on this line' })
  if (line.render_status === 'awaiting_photo') {
    return res.status(409).json({ message: 'line awaits the customer photo — use the photo-attach flow' })
  }
  if (line.render_status === 'ready' && line.production_package_id) {
    return res.status(409).json({ message: 'line already has a ready package' })
  }
  if (!line.order_id) {
    return res.status(422).json({ message: 'line has no order reference (frozen before order_id was recorded)' })
  }

  // product id for the schema lookup comes from the order item
  const orders: IOrderModuleService = req.scope.resolve(Modules.ORDER)
  const order = await orders.retrieveOrder(line.order_id, { relations: ['items'] })
  const item = (order.items ?? []).find((i) => i.id === lineItemId)
  if (!item) return res.status(404).json({ message: 'line not found in its order' })

  const result = await enqueueRenderForLine(req.scope, {
    orderId: order.id,
    orderDisplayId: (order.display_id as number | undefined) ?? null,
    lineItemId,
    designStateId: line.design_state_id,
    schemaProductId: ((item as unknown as { product_id?: string | null }).product_id ?? '') as string,
    forceNew: true,
  })
  if (!result.ok) {
    return res.status(409).json({ message: `render not queued: ${result.reason}` })
  }

  await personalization.updateOrderLineDesigns([{ id: line.id, render_status: 'queued' }])
  res.json({ ok: true, jobQueued: result.queued })
}

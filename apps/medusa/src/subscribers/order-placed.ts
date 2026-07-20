import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'
import type { IOrderModuleService } from '@medusajs/framework/types'
import { PERSONALIZATION_MODULE } from '../modules/personalization'
import type PersonalizationModuleService from '../modules/personalization/service'

/**
 * The purchase-time freeze (FR-029/FR-030, Principle II). When an order is placed, every
 * line that carries `metadata.design_id` gets an order_line_design row: the design and
 * schema version are snapshotted, the per-line withdrawal right is computed and stored
 * (never recomputed afterwards), and the render status starts as queued/awaiting_photo.
 */
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve('logger')
  const orders: IOrderModuleService = container.resolve(Modules.ORDER)
  const personalization: PersonalizationModuleService = container.resolve(PERSONALIZATION_MODULE)

  const order = await orders.retrieveOrder(data.id, { relations: ['items'] })
  let frozen = 0

  for (const item of order.items ?? []) {
    const designId = (item.metadata as Record<string, unknown> | null)?.design_id
    if (typeof designId !== 'string' || !designId) continue
    try {
      const design = await personalization.retrieveDesignState(designId)
      const line = await personalization.attachDesignToLine({
        medusa_line_item_id: item.id,
        design_state_id: designId,
        schema_version: design.schema_version,
        withdrawal_notice_version: 'v1',
      })
      frozen += 1
      logger.info(
        `[gl] order ${order.display_id ?? order.id}: line ${item.id} frozen (design ${designId}, withdrawal ${line.withdrawal_right}, render ${line.render_status})`,
      )
    } catch (e) {
      // idempotency: a retried event hits the unique medusa_line_item_id constraint
      logger.warn(`[gl] order ${order.id}: line ${item.id} not frozen — ${(e as Error).message}`)
    }
  }

  if (frozen === 0) {
    logger.info(`[gl] order ${order.display_id ?? order.id}: no personalized lines`)
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed',
}

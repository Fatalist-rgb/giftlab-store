import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'
import type { IOrderModuleService } from '@medusajs/framework/types'
import { PERSONALIZATION_MODULE } from '../modules/personalization'
import type PersonalizationModuleService from '../modules/personalization/service'
import { enqueueRenderForLine } from '../lib/render-jobs'
import { WITHDRAWAL_NOTICE_VERSION } from '../lib/legal'

/**
 * The purchase-time freeze + render kickoff (FR-029/FR-030, Principle II, SC-002).
 * Every line carrying `metadata.design_id` gets an order_line_design row (design +
 * schema version snapshotted, per-line withdrawal right stored, never recomputed), and —
 * when the photo side is settled — a render job goes onto the gl-render queue via the
 * shared render-jobs lib. Deferred photos stay awaiting_photo until attached (T049).
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
        withdrawal_notice_version: WITHDRAWAL_NOTICE_VERSION,
        order_id: order.id,
        order_display_id: (order.display_id as number | undefined) ?? null,
      })
      frozen += 1
      logger.info(
        `[gl] order ${order.display_id ?? order.id}: line ${item.id} frozen (design ${designId}, withdrawal ${line.withdrawal_right}, render ${line.render_status})`,
      )

      if (line.render_status !== 'queued') continue // deferred waits for the photo (T049)

      const schemaProductId =
        ((item as unknown as { product_id?: string | null }).product_id ?? design.product_schema_id) as string
      const result = await enqueueRenderForLine(container, {
        orderId: order.id,
        orderDisplayId: (order.display_id as number | undefined) ?? null,
        lineItemId: item.id,
        designStateId: designId,
        schemaProductId,
      })
      logger.info(
        result.ok
          ? `[gl] order ${order.display_id ?? order.id}: render ${result.queued ? 'queued' : 'skipped (no Redis)'} for line ${item.id}`
          : `[gl] order ${order.display_id ?? order.id}: render NOT queued for line ${item.id} — ${result.reason}`,
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

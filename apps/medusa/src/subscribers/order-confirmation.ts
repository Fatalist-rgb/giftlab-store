import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'
import type { INotificationModuleService } from '@medusajs/framework/types'
import { WITHDRAWAL_NOTICE_TEXT, WITHDRAWAL_NOTICE_VERSION } from '../lib/legal'

/**
 * Order confirmation email (T050). Sends through the notification module, so the
 * transport is a provider concern: today the local provider logs the payload; when the
 * client's mail service arrives only medusa-config changes. The payload carries the
 * lines, the total and the withdrawal notice (the buyer must be able to re-read what
 * they agreed to — FR-030).
 */
export default async function orderConfirmationHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve('logger')
  const orders = container.resolve(Modules.ORDER)
  const notifications: INotificationModuleService = container.resolve(Modules.NOTIFICATION)

  // module-native read: line items carry the stored unit_price, shipping methods the
  // shipping amount (the graph totals decorator is unreliable inside event handlers)
  const order = await orders.retrieveOrder(data.id, {
    relations: ['items', 'shipping_methods'],
  })
  if (!order?.email) {
    logger.warn(`[gl] order ${order.display_id ?? order.id}: no email — confirmation skipped`)
    return
  }

  // graph's totals decorator is unreliable inside event handlers — derive from the
  // stored per-line unit prices (verified correct in the DB) + shipping
  const items = (order.items ?? [])
    .filter((i): i is NonNullable<typeof i> => Boolean(i))
    .map((i) => ({
      title: i.title,
      quantity: Number(i.quantity ?? 0),
      unit_price: Number(i.unit_price ?? 0),
      total: Number(i.unit_price ?? 0) * Number(i.quantity ?? 0),
    }))
  const itemTotal = items.reduce((s, i) => s + i.total, 0)
  const shipping = (order.shipping_methods ?? []).reduce(
    (s: number, m: { amount?: unknown } | null) => s + Number(m?.amount ?? 0),
    0,
  )

  const notice = WITHDRAWAL_NOTICE_TEXT.pl // store speaks Polish first; locale-aware later
  try {
    await notifications.createNotifications([
      {
        to: order.email,
        channel: 'email',
        template: 'order-confirmation',
        data: {
          display_id: order.display_id ?? null,
          item_total: itemTotal,
          shipping_total: shipping,
          total: itemTotal + shipping,
          currency: (order.currency_code ?? 'pln').toUpperCase(),
          items,
          withdrawal_notice: { version: WITHDRAWAL_NOTICE_VERSION, ...notice },
        },
      },
    ])
    logger.info(`[gl] order ${order.display_id ?? order.id}: confirmation queued to ${order.email}`)
  } catch (e) {
    // a mail failure must never affect the order itself
    logger.warn(`[gl] order ${order.display_id ?? order.id}: confirmation failed — ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed',
}

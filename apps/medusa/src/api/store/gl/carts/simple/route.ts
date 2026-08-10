import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { ICartModuleService, IRegionModuleService, ISalesChannelModuleService } from '@medusajs/framework/types'
import { addToCartWorkflow, createCartWorkflow } from '@medusajs/medusa/core-flows'
import { clientIp, rateLimit } from '../../../../../lib/rate-limit'

/**
 * POST /store/gl/carts/simple — put an ORDINARY catalogue product into the cart.
 * Personalized figurines go through /store/gl/carts (design-based, ladder-priced);
 * this is the companion path for admin-added goods: standard variant, price-list
 * price, appended to the open cart or starting a new one.
 * Body: { variantId, quantity?, cartId? } → { cartId }.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!rateLimit(`carts-simple:${clientIp(req)}`, 60, 60 * 60 * 1000)) {
    return res.status(429).json({ message: 'too many requests, try later' })
  }
  const body = (req.body ?? {}) as { variantId?: string; quantity?: number; cartId?: string }
  const variantId = body.variantId
  const quantity = Math.max(1, Math.min(50, Math.round(body.quantity ?? 1)))
  if (!variantId) return res.status(400).json({ message: 'variantId is required' })

  // append to the open cart when there is one
  if (body.cartId) {
    try {
      const carts: ICartModuleService = req.scope.resolve(Modules.CART)
      const old = await carts.retrieveCart(body.cartId)
      if (!old.completed_at) {
        await addToCartWorkflow(req.scope).run({
          input: { cart_id: old.id, items: [{ variant_id: variantId, quantity }] },
        })
        return res.status(201).json({ cartId: old.id })
      }
    } catch {
      /* unknown/gone cart — fall through to a fresh one */
    }
  }

  const regions: IRegionModuleService = req.scope.resolve(Modules.REGION)
  const [region] = await regions.listRegions({ currency_code: 'pln' })
  if (!region) return res.status(500).json({ message: 'PLN region is not configured' })
  const channels: ISalesChannelModuleService = req.scope.resolve(Modules.SALES_CHANNEL)
  const [channel] = await channels.listSalesChannels({}, { take: 1 })

  const { result: cart } = await createCartWorkflow(req.scope).run({
    input: {
      region_id: region.id,
      sales_channel_id: channel?.id,
      currency_code: 'pln',
      items: [{ variant_id: variantId, quantity }],
    },
  })
  res.status(201).json({ cartId: cart.id })
}

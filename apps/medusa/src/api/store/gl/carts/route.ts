import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type {
  ICartModuleService,
  IProductModuleService,
  IRegionModuleService,
  ISalesChannelModuleService,
} from '@medusajs/framework/types'
import { createCartWorkflow } from '@medusajs/medusa/core-flows'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../../../../modules/product_customization'
import type ProductCustomizationModuleService from '../../../../modules/product_customization/service'
import { PERSONALIZATION_MODULE } from '../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../modules/personalization/service'
import {
  parseProductSchema,
  unitPriceForQuantity,
  selectionDelta,
  type DesignState,
} from '@gl/constructor-vendored'
import { clientIp, rateLimit } from '../../../../lib/rate-limit'

/**
 * POST /store/gl/carts — build a cart from persisted designs. The server recomputes the
 * quantity-ladder unit price with the engine (total quantity across the submitted designs
 * — FR-012: many designs, one order) and writes it as each line's unit price; the client
 * never dictates a price. Each line carries `metadata.design_id`, which the order.placed
 * subscriber later freezes onto the order line. Body: { productId, designIds: string[], email? }.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!rateLimit(`carts:${clientIp(req)}`, 30, 60 * 60 * 1000)) {
    return res.status(429).json({ message: 'too many requests, try later' })
  }
  const body = (req.body ?? {}) as {
    productId?: string
    designIds?: string[]
    email?: string
    cartId?: string
  }
  const { productId, email } = body
  let designIds = body.designIds ?? []
  if (!productId || !Array.isArray(designIds) || designIds.length === 0) {
    return res.status(400).json({ message: 'productId and a non-empty designIds[] are required' })
  }

  // MERGE: an open cart's designs join the new ones, and the whole set is repriced —
  // the ladder must span the full order, so existing lines cannot keep an old unit
  // price. Rebuilding the cart is the correct move, not appending. The old cart is
  // simply abandoned (harmless). ORDINARY lines (admin-added goods, no design_id)
  // are carried over verbatim — the rebuild must not eat them.
  let carriedEmail: string | null = null
  const carriedSimple: Array<{ variant_id: string; quantity: number }> = []
  if (body.cartId) {
    try {
      const carts: ICartModuleService = req.scope.resolve(Modules.CART)
      const old = await carts.retrieveCart(body.cartId, { relations: ['items'] })
      if (!old.completed_at) {
        const oldIds = (old.items ?? [])
          .map((i) => (i.metadata as Record<string, unknown> | null)?.design_id)
          .filter((x): x is string => typeof x === 'string')
        designIds = [...new Set([...oldIds, ...designIds])]
        carriedEmail = old.email ?? null
        for (const i of old.items ?? []) {
          const meta = i.metadata as Record<string, unknown> | null
          if (!meta?.design_id && i.variant_id) {
            carriedSimple.push({ variant_id: i.variant_id, quantity: i.quantity as number })
          }
        }
      }
    } catch {
      /* unknown/gone cart — proceed with the new designs only */
    }
  }

  // resolve the product (id or handle) with its variant
  const products: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
  let [product] = await products.listProducts({ id: productId }, { relations: ['variants'] })
  if (!product) {
    ;[product] = await products.listProducts({ handle: productId }, { relations: ['variants'] })
  }
  const variant = product?.variants?.[0]
  if (!product || !variant) {
    return res.status(404).json({ message: `product not found: ${productId}` })
  }

  // the published schema is the pricing authority
  const schemas: ProductCustomizationModuleService = req.scope.resolve(PRODUCT_CUSTOMIZATION_MODULE)
  const active = await schemas.getActiveSchema(product.id)
  if (!active) {
    return res.status(404).json({ message: `no published schema for product ${product.id}` })
  }
  const schema = parseProductSchema(active.definition)

  // load the persisted designs (all must exist)
  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)
  const designs = await personalization.listDesignStates({ id: designIds })
  if (designs.length !== designIds.length) {
    const found = new Set(designs.map((d) => d.id))
    const missing = designIds.filter((id) => !found.has(id))
    return res.status(404).json({ message: `designs not found: ${missing.join(', ')}` })
  }

  // one cart = one product type for now: every line resolves to THIS product's variant
  // and the ladder is per-schema. Designs of another product (merged from an old cart
  // after the customer switched catalogue items) are dropped from the merge, not mixed.
  const foreign = designs.filter((d) => d.product_schema_id !== schema.id)
  if (foreign.length) {
    const foreignIds = new Set(foreign.map((d) => d.id))
    const kept = designs.filter((d) => !foreignIds.has(d.id))
    if (!kept.length) {
      return res.status(409).json({
        message: `designs belong to another product (schema ${foreign[0]!.product_schema_id}); cross-product carts are not supported yet`,
      })
    }
    designIds = kept.map((d) => d.id)
    designs.length = 0
    designs.push(...kept)
  }

  // ladder price from the TOTAL quantity across designs; per-line deltas on top
  const totalQty = designs.reduce((s, d) => s + Math.max(1, d.quantity ?? 1), 0)
  const { unitPrice: ladderUnit } = unitPriceForQuantity(schema.pricingRules, totalQty)

  const items = designs.map((d) => {
    const engineDesign = {
      characterSelections: (d.character_selections ?? {}) as Record<string, string>,
      selectedOptions: (d.selected_options ?? {}) as Record<string, string>,
    } as DesignState
    const unitGrosz = ladderUnit + selectionDelta(schema, engineDesign)
    // what the customer actually configured, denormalised onto the line: the cart and
    // the order confirmation show "which pose, whose name" without loading the design
    const pose = Object.values(engineDesign.characterSelections)[0] ?? null
    const printedName =
      ((d.text_values ?? []) as Array<{ field_id?: string; value?: string }>).find(
        (t) => t.field_id === 'name' && t.value?.trim(),
      )?.value ?? null
    return {
      variant_id: variant.id,
      quantity: Math.max(1, d.quantity ?? 1),
      // Medusa v2 stores amounts in major currency units; the engine works in grosz
      unit_price: unitGrosz / 100,
      metadata: {
        design_id: d.id,
        gl_unit_price_grosz: unitGrosz,
        ...(pose ? { gl_pose: pose } : {}),
        ...(printedName ? { gl_name: printedName } : {}),
      },
    }
  })

  // PL region + default channel
  const regions: IRegionModuleService = req.scope.resolve(Modules.REGION)
  const [region] = await regions.listRegions({ currency_code: 'pln' })
  if (!region) return res.status(500).json({ message: 'PLN region is not configured' })
  const channels: ISalesChannelModuleService = req.scope.resolve(Modules.SALES_CHANNEL)
  const [channel] = await channels.listSalesChannels({}, { take: 1 })

  const { result: cart } = await createCartWorkflow(req.scope).run({
    input: {
      region_id: region.id,
      sales_channel_id: channel?.id,
      email: email ?? carriedEmail ?? undefined,
      currency_code: 'pln',
      // ordinary lines ride along with NO unit_price — the price list reprices them
      items: [...items, ...carriedSimple],
    },
  })

  res.status(201).json({
    cartId: cart.id,
    totalQuantity: totalQty,
    ladderUnitGrosz: ladderUnit,
    lines: items.map((i) => ({ design_id: i.metadata.design_id, quantity: i.quantity, unit_grosz: i.metadata.gl_unit_price_grosz })),
  })
}

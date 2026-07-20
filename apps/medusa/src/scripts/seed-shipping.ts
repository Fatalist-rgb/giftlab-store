import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createShippingOptionsWorkflow } from '@medusajs/medusa/core-flows'
import { FIGURINE_HANDLE } from './seed-catalog'

/**
 * Make Poland shippable: a "Polska" service zone (country pl) in the existing
 * fulfillment set, a flat-rate courier option (placeholder price until the client
 * confirms carriers), the stock location linked to the sales channel, and the figurine
 * variant set to made-to-order (manage_inventory=false — it is manufactured per order,
 * not picked from stock). Idempotent. Run with:
 *   npx medusa exec ./src/scripts/seed-shipping.ts
 */
export default async function ({ container }: ExecArgs) {
  const fulfillment = container.resolve(Modules.FULFILLMENT)
  const stock = container.resolve(Modules.STOCK_LOCATION)
  const channels = container.resolve(Modules.SALES_CHANNEL)
  const products = container.resolve(Modules.PRODUCT)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  // 1. the shipping fulfillment set (created by the starter seed)
  const [set] = await fulfillment.listFulfillmentSets(
    { type: 'shipping' },
    { relations: ['service_zones', 'service_zones.geo_zones'] },
  )
  if (!set) throw new Error('no shipping fulfillment set found — run the base seed first')

  // 2. a service zone covering Poland
  let zone = (set.service_zones ?? []).find((z) =>
    (z.geo_zones ?? []).some((g: { country_code?: string }) => g.country_code === 'pl'),
  )
  if (!zone) {
    const updated = await fulfillment.updateFulfillmentSets({
      id: set.id,
      service_zones: [
        ...(set.service_zones ?? []).map((z) => ({ id: z.id })),
        { name: 'Polska', geo_zones: [{ type: 'country' as const, country_code: 'pl' }] },
      ],
    })
    const zones = (updated.service_zones ?? []) as typeof set.service_zones
    zone = zones!.find((z) => z.name === 'Polska')
    console.log('service zone created: Polska')
  } else {
    console.log('service zone with pl exists:', zone.name)
  }
  if (!zone) throw new Error('failed to create the Polska service zone')

  // 3. courier shipping option for that zone (flat, PLN; placeholder price)
  const OPTION_NAME = 'Dostawa kurierem'
  const existing = await fulfillment.listShippingOptions({ name: OPTION_NAME })
  if (!existing.length) {
    const [profile] = await fulfillment.listShippingProfiles({ type: 'default' })
    if (!profile) throw new Error('no default shipping profile')
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: OPTION_NAME,
          service_zone_id: zone.id,
          shipping_profile_id: profile.id,
          provider_id: 'manual_manual',
          price_type: 'flat' as const,
          type: { label: 'Kurier', code: 'courier', description: 'Dostawa kurierem, 1-2 dni robocze' },
          prices: [{ currency_code: 'pln', amount: 15.99 }],
          rules: [
            { attribute: 'enabled_in_store', value: 'true', operator: 'eq' as const },
            { attribute: 'is_return', value: 'false', operator: 'eq' as const },
          ],
        },
      ],
    })
    console.log(`shipping option created: ${OPTION_NAME} (15.99 PLN, placeholder)`)
  } else {
    console.log('shipping option exists:', OPTION_NAME)
  }

  // 3b. normalize rule values that were stored double-quoted ("\"true\"" never matches)
  const [option] = await fulfillment.listShippingOptions({ name: OPTION_NAME }, { relations: ['rules'] })
  for (const rule of option?.rules ?? []) {
    const raw = String(rule.value ?? '')
    if (rule.operator === 'eq' && raw.startsWith('"') && raw.endsWith('"')) {
      await fulfillment.updateShippingOptionRules([
        { id: rule.id, attribute: rule.attribute, operator: 'eq', value: raw.slice(1, -1) },
      ])
      console.log(`rule normalized: ${rule.attribute} -> ${raw.slice(1, -1)}`)
    }
  }

  // 4. stock location linked to the sales channel (needed for checkout availability)
  const [location] = await stock.listStockLocations({})
  const [channel] = await channels.listSalesChannels({}, { take: 1 })
  if (location && channel) {
    try {
      await link.create({
        [Modules.SALES_CHANNEL]: { sales_channel_id: channel.id },
        [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      })
      console.log('stock location linked to sales channel')
    } catch {
      console.log('stock location link already present')
    }
  }

  // 5. figurine is made-to-order: no inventory management on the variant
  const [product] = await products.listProducts({ handle: FIGURINE_HANDLE }, { relations: ['variants'] })
  if (product) {
    // 5a. the product must be linked to a shipping profile, or no shipping option matches it
    const [defaultProfile] = await fulfillment.listShippingProfiles({ type: 'default' })
    if (defaultProfile) {
      try {
        await link.create({
          [Modules.PRODUCT]: { product_id: product.id },
          [Modules.FULFILLMENT]: { shipping_profile_id: defaultProfile.id },
        })
        console.log('product linked to the default shipping profile')
      } catch {
        console.log('product-profile link already present')
      }
    }
    const variant = (product.variants ?? [])[0]
    if (variant && variant.manage_inventory !== false) {
      await products.updateProductVariants(variant.id, { manage_inventory: false })
      console.log('variant set to made-to-order (manage_inventory=false)')
    } else {
      console.log('variant already made-to-order')
    }
  }
}

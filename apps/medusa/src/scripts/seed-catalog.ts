import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from '@medusajs/medusa/core-flows'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../modules/product_customization'
import type ProductCustomizationModuleService from '../modules/product_customization/service'
import { PRICE_HISTORY_MODULE } from '../modules/price_history'
import type PriceHistoryModuleService from '../modules/price_history/service'

/**
 * Seed the commerce catalogue skeleton: PL region, sales channel, a category tree
 * placeholder, the figurine as a REAL Medusa product (variant + PLN price), publishable
 * keys linked to the channel, and the constructor schema published against the real
 * product id. Idempotent — safe to re-run. Category names are placeholders until the
 * client sends the real list. Run with:
 *   npx medusa exec ./src/scripts/seed-catalog.ts
 */
export const FIGURINE_HANDLE = 'figurka-z-brzuszkiem'

const figurineSchema = (productId: string) => ({
  id: 'ps_figurine', medusaProductId: productId, version: 1, status: 'published',
  canvasPx: { w: 304, h: 424 },
  characterLayers: [{
    id: 'body', zIndex: 10, label: { pl: 'Postać', en: 'Character', uk: 'Персонаж' },
    variants: [
      { id: 'blue', label: { pl: 'Niebieski', en: 'Blue', uk: 'Синій' }, assetKey: '/art/body-blue.png', priceDelta: 0 },
      { id: 'green', label: { pl: 'Zielony', en: 'Green', uk: 'Зелений' }, assetKey: '/art/body-green.png', priceDelta: 0 },
      { id: 'pink', label: { pl: 'Różowy', en: 'Pink', uk: 'Рожевий' }, assetKey: '/art/body-pink.png', priceDelta: 0 },
    ],
  }],
  faceZone: { bounds: { x: 92, y: 40, w: 120, h: 132 }, maskAssetKey: '/art/face-mask.png', minResolutionPx: { w: 900, h: 900 }, transforms: ['move', 'scale', 'rotate'], zIndex: 15 },
  textFields: [{ id: 'name', label: { pl: 'Imię', en: 'Name', uk: "Ім'я" }, maxLen: 14, fonts: ['Bricolage Grotesque'], colors: ['#17131A'], placement: 'figure', zIndex: 100 }],
  options: [],
  physical: { heightMm: 110, magneticBacking: true, material: 'acrylic+silicone' },
  pricingRules: { base: 7900, currency: 'PLN', quantityLadder: [{ minQty: 1, unitPrice: 7900 }, { minQty: 3, unitPrice: 6500 }, { minQty: 6, unitPrice: 4900 }] },
  cutContour: { source: 'composite', offsetMm: 3, spotName: 'CutContour' },
})

export default async function ({ container }: ExecArgs) {
  const regionSvc = container.resolve(Modules.REGION)
  const channelSvc = container.resolve(Modules.SALES_CHANNEL)
  const productSvc = container.resolve(Modules.PRODUCT)
  const apiKeySvc = container.resolve(Modules.API_KEY)

  // 1. PL region (PLN)
  let [region] = await regionSvc.listRegions({ currency_code: 'pln' })
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: { regions: [{ name: 'Polska', currency_code: 'pln', countries: ['pl'], payment_providers: ['pp_system_default'] }] },
    })
    region = result[0]
    console.log('region created:', region.name)
  } else {
    console.log('region exists:', region.name)
  }

  // 2. sales channel
  let [channel] = await channelSvc.listSalesChannels({ name: 'Default Sales Channel' })
  if (!channel) {
    ;[channel] = await channelSvc.listSalesChannels({}, { take: 1 })
  }
  if (!channel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: 'Default Sales Channel' }] },
    })
    channel = result[0]
    console.log('sales channel created')
  } else {
    console.log('sales channel exists:', channel.name)
  }

  // 3. category (placeholder name until the client sends the real tree)
  const CATEGORY = 'Figurki personalizowane'
  let [category] = await productSvc.listProductCategories({ name: CATEGORY })
  if (!category) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: [{ name: CATEGORY, is_active: true }] },
    })
    category = result[0]
    console.log('category created:', CATEGORY)
  } else {
    console.log('category exists:', CATEGORY)
  }

  // 4. the figurine as a real product
  let [product] = await productSvc.listProducts({ handle: FIGURINE_HANDLE })
  if (!product) {
    const { result } = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: 'Figurka z brzuszkiem',
            handle: FIGURINE_HANDLE,
            description:
              'Personalizowana figurka akrylowa (11 cm) z Twoją twarzą i imieniem. Wbudowany magnes.',
            status: 'published' as const,
            category_ids: [category.id],
            sales_channels: [{ id: channel.id }],
            options: [{ title: 'Wariant', values: ['Standard'] }],
            variants: [
              {
                title: 'Standard',
                sku: 'FIG-BRZUSZEK-STD',
                options: { Wariant: 'Standard' },
                prices: [{ amount: 79, currency_code: 'pln' }],
              },
            ],
          },
        ],
      },
    })
    product = result[0]
    console.log('product created:', product.title, product.id)
  } else {
    console.log('product exists:', product.title, product.id)
  }

  // 5. link every publishable key to the sales channel (store API requires it)
  const keys = await apiKeySvc.listApiKeys({ type: 'publishable' })
  for (const key of keys) {
    try {
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: { id: key.id, add: [channel.id] },
      })
    } catch {
      /* already linked */
    }
  }
  console.log(`publishable keys linked to channel: ${keys.length}`)

  // 6. constructor schema against the real product id (+ start the price history)
  const schemas: ProductCustomizationModuleService = container.resolve(PRODUCT_CUSTOMIZATION_MODULE)
  const active = await schemas.getActiveSchema(product.id)
  if (!active) {
    const published = await schemas.publishSchema(product.id, figurineSchema(product.id))
    console.log(`constructor schema published v${published.version} for ${product.id}`)
  } else {
    console.log(`constructor schema already active (v${active.version})`)
  }
  const prices: PriceHistoryModuleService = container.resolve(PRICE_HISTORY_MODULE)
  await prices.recordPrice({ medusa_product_id: product.id, price: 7900 })
  console.log('price history ensured (7900 grosz)')
}

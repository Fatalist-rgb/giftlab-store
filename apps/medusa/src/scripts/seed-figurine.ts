import { ExecArgs } from '@medusajs/framework/types'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../modules/product_customization'
import type ProductCustomizationModuleService from '../modules/product_customization/service'
import { PRICE_HISTORY_MODULE } from '../modules/price_history'
import type PriceHistoryModuleService from '../modules/price_history/service'

/**
 * Seed the figurine's constructor ProductSchema and its launch price. Publishing runs
 * the schema through the @gl/constructor engine (full validation + free-default), and
 * recording the price starts the Omnibus history from day one (FR-039). Idempotent
 * (publishing bumps the version; price recording de-dupes). Run with:
 *   npx medusa exec ./src/scripts/seed-figurine.ts
 */
export const FIGURINE_PRODUCT_ID = 'prod_belly'

const figurineSchema = {
  id: 'ps_figurine', medusaProductId: FIGURINE_PRODUCT_ID, version: 1, status: 'published',
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
}

export default async function ({ container }: ExecArgs) {
  const schemas: ProductCustomizationModuleService = container.resolve(PRODUCT_CUSTOMIZATION_MODULE)
  const prices: PriceHistoryModuleService = container.resolve(PRICE_HISTORY_MODULE)

  const published = await schemas.publishSchema(FIGURINE_PRODUCT_ID, figurineSchema)
  console.log(`published schema v${published.version} for ${FIGURINE_PRODUCT_ID}`)

  const entry = await prices.recordPrice({ medusa_product_id: FIGURINE_PRODUCT_ID, price: 7900 })
  console.log(`launch price recorded: ${entry.price} grosz`)
}

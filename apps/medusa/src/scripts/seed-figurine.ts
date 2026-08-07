import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
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
/** the catalogue product the storefront actually renders */
export const FIGURINE_HANDLE = 'figurka-z-brzuszkiem'

/**
 * The client's own figurine renders (three poses of the same body, headless by design —
 * the customer's face is the head). They were laid onto one shared canvas so the face
 * zone is identical in every pose: switching pose does not move the face.
 * Source + alignment: apps/medusa/prep-bodies.mjs → export-art.mjs.
 */
const figurineSchema = {
  id: 'ps_figurine', medusaProductId: FIGURINE_PRODUCT_ID, version: 1, status: 'published',
  canvasPx: { w: 360, h: 660 },
  characterLayers: [{
    id: 'body', zIndex: 10, label: { pl: 'Postawa', en: 'Pose', uk: 'Поза' },
    variants: [
      { id: 'stoi', label: { pl: 'Na stojąco', en: 'Standing', uk: 'Стоячи' }, assetKey: '/art/body-stoi.png', priceDelta: 0 },
      { id: 'piwo', label: { pl: 'Z kuflem piwa', en: 'With a beer', uk: 'З келихом пива' }, assetKey: '/art/body-stoi-piwo.png', priceDelta: 0 },
      { id: 'kieszen', label: { pl: 'Ręka w kieszeni', en: 'Hand in pocket', uk: 'Рука в кишені' }, assetKey: '/art/body-kieszen.png', priceDelta: 0 },
    ],
  }],
  faceZone: { bounds: { x: 91, y: 17, w: 176, h: 240 }, maskAssetKey: '/art/face-mask.png', minResolutionPx: { w: 900, h: 900 }, transforms: ['move', 'scale', 'rotate'], zIndex: 15 },
  textFields: [{ id: 'name', label: { pl: 'Imię', en: 'Name', uk: "Ім'я" }, maxLen: 14, fonts: ['Bricolage Grotesque'], colors: ['#17131A'], placement: 'figure', zIndex: 100 }],
  options: [],
  physical: { heightMm: 110, magneticBacking: true, material: 'acrylic+silicone' },
  pricingRules: { base: 7900, currency: 'PLN', quantityLadder: [{ minQty: 1, unitPrice: 7900 }, { minQty: 3, unitPrice: 6500 }, { minQty: 6, unitPrice: 4900 }] },
  cutContour: { source: 'composite', offsetMm: 3, spotName: 'CutContour' },
}

export default async function ({ container }: ExecArgs) {
  const schemas: ProductCustomizationModuleService = container.resolve(PRODUCT_CUSTOMIZATION_MODULE)
  const prices: PriceHistoryModuleService = container.resolve(PRICE_HISTORY_MODULE)

  // the real catalogue product owns the schema; `prod_belly` is only the pre-catalogue
  // placeholder id, and publishing against it would leave the shop on the old artwork
  const products = container.resolve(Modules.PRODUCT)
  const [flagship] = await products.listProducts({ handle: FIGURINE_HANDLE })
  const productId = flagship?.id ?? FIGURINE_PRODUCT_ID
  console.log(`target product: ${productId}${flagship ? ` (${FIGURINE_HANDLE})` : ' — handle not found, using placeholder id'}`)

  const published = await schemas.publishSchema(productId, { ...figurineSchema, medusaProductId: productId })
  console.log(`published schema v${published.version} for ${productId}`)

  const entry = await prices.recordPrice({ medusa_product_id: productId, price: 7900 })
  console.log(`launch price recorded: ${entry.price} grosz`)
}

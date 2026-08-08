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
 * The six poses, as photographed — the same set the approved design sells.
 *
 * Each pose is its OWN photo crop, so it carries its own pixel space, its own face hole
 * and its own anchor for the printed name; the engine reads those off the variant
 * (`canvasPx` / `faceBounds` / `namePos`). They were not padded onto one shared canvas:
 * a 1445×1083 lying figure squeezed into a standing frame wastes most of the print
 * resolution and drags an empty margin through the cut contour.
 *
 * `faceBounds` is the bounding box of the elliptical hole in the acrylic. The face is
 * drawn into that window, so it can never spill past the silhouette.
 */
const POSE_VARIANTS = [
  { id: 'stoi', label: { pl: 'Na stojąco', en: 'Standing', uk: 'Стоячи' },
    assetKey: '/art/poses/stoi.webp', priceDelta: 0,
    canvasPx: { w: 615, h: 1231 }, faceBounds: { x: 152, y: 62, w: 300, h: 410 }, namePos: { x: 307, y: 800, rot: -8 } },
  { id: 'stoi-piwo', label: { pl: 'Na stojąco z piwem', en: 'Standing with a beer', uk: 'Стоячи з пивом' },
    assetKey: '/art/poses/stoi-piwo.webp', priceDelta: 0,
    canvasPx: { w: 659, h: 1238 }, faceBounds: { x: 207, y: 91, w: 294, h: 402 }, namePos: { x: 300, y: 800, rot: -8 } },
  { id: 'kieszen', label: { pl: 'Ręce w kieszeniach', en: 'Hands in pockets', uk: 'Руки в кишенях' },
    assetKey: '/art/poses/kieszen.webp', priceDelta: 0,
    canvasPx: { w: 615, h: 1212 }, faceBounds: { x: 150, y: 48, w: 298, h: 410 }, namePos: { x: 298, y: 780, rot: -8 } },
  { id: 'kufel', label: { pl: 'Z kuflem, na stojąco', en: 'With a mug, standing', uk: 'З кухлем, стоячи' },
    assetKey: '/art/poses/kufel.webp', priceDelta: 0,
    canvasPx: { w: 854, h: 1435 }, faceBounds: { x: 207, y: 189, w: 318, h: 436 }, namePos: { x: 360, y: 900, rot: -8 } },
  { id: 'lezy', label: { pl: 'Na leżąco', en: 'Lying down', uk: 'Лежачи' },
    assetKey: '/art/poses/lezy.webp', priceDelta: 0,
    canvasPx: { w: 1445, h: 1083 }, faceBounds: { x: 205, y: 75, w: 310, h: 426 }, namePos: { x: 570, y: 640, rot: -6 } },
  { id: 'lezy-piwo', label: { pl: 'Na leżąco z piwem', en: 'Lying down with a beer', uk: 'Лежачи з пивом' },
    assetKey: '/art/poses/lezy-piwo.webp', priceDelta: 0,
    canvasPx: { w: 1438, h: 1077 }, faceBounds: { x: 204, y: 72, w: 310, h: 426 }, namePos: { x: 555, y: 645, rot: -6 } },
]

const figurineSchema = {
  id: 'ps_figurine', medusaProductId: FIGURINE_PRODUCT_ID, version: 1, status: 'published',
  // product-level geometry is the standing pose; every variant restates its own
  canvasPx: { w: 615, h: 1231 },
  characterLayers: [{
    id: 'body', zIndex: 10, label: { pl: 'Postawa', en: 'Pose', uk: 'Поза' },
    variants: POSE_VARIANTS,
  }],
  faceZone: { bounds: { x: 152, y: 62, w: 300, h: 410 }, maskAssetKey: '/art/face-mask.png', minResolutionPx: { w: 900, h: 900 }, transforms: ['move', 'scale', 'rotate'], zIndex: 15 },
  // white with an ink outline: it has to read on skin and on a dark shirt alike
  textFields: [{ id: 'name', label: { pl: 'Imię', en: 'Name', uk: "Ім'я" }, maxLen: 14, fonts: ['Bricolage Grotesque'], colors: ['#FFFFFF'], placement: 'figure', zIndex: 100 }],
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

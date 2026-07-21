import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createProductCategoriesWorkflow, createProductsWorkflow } from '@medusajs/medusa/core-flows'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../modules/product_customization'
import type ProductCustomizationModuleService from '../modules/product_customization/service'
import { PRICE_HISTORY_MODULE } from '../modules/price_history'
import type PriceHistoryModuleService from '../modules/price_history/service'

/**
 * Catalog v1 (taxonomy per the reference-store model, ORIGINAL placeholder art):
 * four recipient/occasion categories and three new single-face products next to the
 * flagship. Couples/family figurines wait for multi-face engine support — the category
 * exists so the client sees the target shape. Idempotent. Run with:
 *   npx medusa exec ./src/scripts/seed-categories.ts
 */

type Variant = { id: string; pl: string; en: string; uk: string; asset: string }

const LADDER = {
  base: 7900,
  currency: 'PLN',
  quantityLadder: [
    { minQty: 1, unitPrice: 7900 },
    { minQty: 3, unitPrice: 6500 },
    { minQty: 6, unitPrice: 4900 },
  ],
}

const schemaFor = (handle: string, productId: string, layerLabel: { pl: string; en: string; uk: string }, variants: Variant[]) => ({
  id: `ps_${handle.replace(/-/g, '_')}`,
  medusaProductId: productId,
  version: 1,
  status: 'published',
  canvasPx: { w: 304, h: 424 },
  characterLayers: [
    {
      id: 'body',
      zIndex: 10,
      label: layerLabel,
      variants: variants.map((v) => ({
        id: v.id,
        label: { pl: v.pl, en: v.en, uk: v.uk },
        assetKey: `/art/${v.asset}`,
        priceDelta: 0,
      })),
    },
  ],
  faceZone: {
    bounds: { x: 92, y: 40, w: 120, h: 132 },
    maskAssetKey: '/art/face-mask.png',
    minResolutionPx: { w: 900, h: 900 },
    transforms: ['move', 'scale', 'rotate'],
    zIndex: 15,
  },
  textFields: [
    { id: 'name', label: { pl: 'Imię', en: 'Name', uk: "Ім'я" }, maxLen: 14, fonts: ['Bricolage Grotesque'], colors: ['#17131A'], placement: 'figure', zIndex: 100 },
  ],
  options: [],
  physical: { heightMm: 110, magneticBacking: true, material: 'acrylic+silicone' },
  pricingRules: LADDER,
  cutContour: { source: 'composite', offsetMm: 3, spotName: 'CutContour' },
})

const CATEGORIES = [
  { key: 'mama', name: 'Mama i ciąża', description: 'Pamiątka wyjątkowych dziewięciu miesięcy.' },
  { key: 'dzieci', name: 'Dzieci', description: 'Mali bohaterowie w wielkiej roli.' },
  { key: 'zwierzaki', name: 'Zwierzaki', description: 'Pupil, który zawsze jest obok.' },
  { key: 'okazje', name: 'Święta i okazje', description: 'Prezenty, które zostają na lata.' },
]

const PRODUCTS: Array<{
  handle: string
  title: string
  description: string
  sku: string
  category: string
  layerLabel: { pl: string; en: string; uk: string }
  variants: Variant[]
}> = [
  {
    handle: 'figurka-superbohater',
    title: 'Figurka Superbohater',
    description:
      'Twoje dziecko jako superbohater — peleryna, gwiazda i jego własna twarz. Akryl 11 cm, magnes w zestawie.',
    sku: 'FIG-HERO-STD',
    category: 'dzieci',
    layerLabel: { pl: 'Kostium', en: 'Suit', uk: 'Костюм' },
    variants: [
      { id: 'red', pl: 'Czerwona peleryna', en: 'Red cape', uk: 'Червоний плащ', asset: 'hero-red.png' },
      { id: 'black', pl: 'Czarna peleryna', en: 'Black cape', uk: 'Чорний плащ', asset: 'hero-black.png' },
      { id: 'gold', pl: 'Złota peleryna', en: 'Gold cape', uk: 'Золотий плащ', asset: 'hero-gold.png' },
    ],
  },
  {
    handle: 'figurka-pupil',
    title: 'Figurka Pupil',
    description:
      'Piesek, kotek albo króliczek z pyszczkiem Twojego pupila. Akryl 11 cm, magnes w zestawie.',
    sku: 'FIG-PET-STD',
    category: 'zwierzaki',
    layerLabel: { pl: 'Zwierzak', en: 'Animal', uk: 'Тваринка' },
    variants: [
      { id: 'dog', pl: 'Piesek', en: 'Dog', uk: 'Песик', asset: 'pet-dog.png' },
      { id: 'cat', pl: 'Kotek', en: 'Cat', uk: 'Котик', asset: 'pet-cat.png' },
      { id: 'rabbit', pl: 'Króliczek', en: 'Rabbit', uk: 'Кролик', asset: 'pet-rabbit.png' },
    ],
  },
  {
    handle: 'figurka-swiateczna',
    title: 'Figurka Świąteczna',
    description:
      'Mikołaj, elf albo renifer z twarzą bliskiej osoby — prezent i ozdoba w jednym. Akryl 11 cm, magnes w zestawie.',
    sku: 'FIG-XMAS-STD',
    category: 'okazje',
    layerLabel: { pl: 'Strój', en: 'Outfit', uk: 'Вбрання' },
    variants: [
      { id: 'santa', pl: 'Mikołaj', en: 'Santa', uk: 'Миколай', asset: 'xmas-santa.png' },
      { id: 'elf', pl: 'Elf', en: 'Elf', uk: 'Ельф', asset: 'xmas-elf.png' },
      { id: 'reindeer', pl: 'Renifer', en: 'Reindeer', uk: 'Олень', asset: 'xmas-reindeer.png' },
    ],
  },
]

export default async function ({ container }: ExecArgs) {
  const products = container.resolve(Modules.PRODUCT)
  const channels = container.resolve(Modules.SALES_CHANNEL)
  const fulfillment = container.resolve(Modules.FULFILLMENT)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const schemas: ProductCustomizationModuleService = container.resolve(PRODUCT_CUSTOMIZATION_MODULE)
  const prices: PriceHistoryModuleService = container.resolve(PRICE_HISTORY_MODULE)

  const [channel] = await channels.listSalesChannels({}, { take: 1 })
  const [profile] = await fulfillment.listShippingProfiles({ type: 'default' })
  if (!channel || !profile) throw new Error('run seed-catalog + seed-shipping first')

  // 1. categories
  const categoryByKey = new Map<string, { id: string }>()
  for (const c of CATEGORIES) {
    let [existing] = await products.listProductCategories({ name: c.name })
    if (!existing) {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: { product_categories: [{ name: c.name, description: c.description, is_active: true }] },
      })
      existing = result[0]
      console.log('category created:', c.name)
    } else {
      console.log('category exists:', c.name)
    }
    categoryByKey.set(c.key, existing)
  }

  // flagship joins its category
  const [flagship] = await products.listProducts({ handle: 'figurka-z-brzuszkiem' })
  if (flagship) {
    try {
      await products.updateProducts(flagship.id, { category_ids: [categoryByKey.get('mama')!.id] })
      console.log('flagship assigned to: Mama i ciąża')
    } catch {
      console.log('flagship category unchanged')
    }
  }

  // 2. products + schemas + prices
  for (const p of PRODUCTS) {
    let [product] = await products.listProducts({ handle: p.handle })
    if (!product) {
      const { result } = await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: p.title,
              handle: p.handle,
              description: p.description,
              status: 'published' as const,
              category_ids: [categoryByKey.get(p.category)!.id],
              sales_channels: [{ id: channel.id }],
              options: [{ title: 'Wariant', values: ['Standard'] }],
              variants: [
                {
                  title: 'Standard',
                  sku: p.sku,
                  options: { Wariant: 'Standard' },
                  manage_inventory: false,
                  prices: [{ amount: 79, currency_code: 'pln' }],
                },
              ],
            },
          ],
        },
      })
      product = result[0]
      console.log('product created:', p.title)
    } else {
      console.log('product exists:', p.title)
    }

    // shipping profile link (or no shipping option matches at checkout)
    try {
      await link.create({
        [Modules.PRODUCT]: { product_id: product.id },
        [Modules.FULFILLMENT]: { shipping_profile_id: profile.id },
      })
    } catch {
      /* already linked */
    }

    const active = await schemas.getActiveSchema(product.id)
    if (!active) {
      const published = await schemas.publishSchema(
        product.id,
        schemaFor(p.handle, product.id, p.layerLabel, p.variants),
      )
      console.log(`  schema published v${published.version}`)
    } else {
      console.log(`  schema active v${active.version}`)
    }
    await prices.recordPrice({ medusa_product_id: product.id, price: LADDER.base })
  }
  console.log('catalog v1 seeded')
}

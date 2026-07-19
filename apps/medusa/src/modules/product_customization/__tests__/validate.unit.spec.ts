import { validatePublishableSchema } from '../validate'

// A valid figurine schema (mirror of the storefront demo) — exercises the real engine.
const validSchema = {
  id: 'ps_figurine',
  medusaProductId: 'prod_belly',
  version: 1,
  status: 'published',
  canvasPx: { w: 304, h: 424 },
  characterLayers: [
    {
      id: 'body',
      zIndex: 10,
      label: { pl: 'Postać', en: 'Character', uk: 'Персонаж' },
      variants: [
        { id: 'blue', label: { pl: 'Niebieski', en: 'Blue', uk: 'Синій' }, assetKey: '/art/body-blue.png', priceDelta: 0 },
        { id: 'pink', label: { pl: 'Różowy', en: 'Pink', uk: 'Рожевий' }, assetKey: '/art/body-pink.png', priceDelta: 0 },
      ],
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
  pricingRules: {
    base: 7900,
    currency: 'PLN',
    quantityLadder: [
      { minQty: 1, unitPrice: 7900 },
      { minQty: 3, unitPrice: 6500 },
      { minQty: 6, unitPrice: 4900 },
    ],
  },
  cutContour: { source: 'composite', offsetMm: 3, spotName: 'CutContour' },
}

describe('product_customization — schema validation via @gl/constructor engine', () => {
  it('accepts a valid schema whose default selection is free', () => {
    expect(() => validatePublishableSchema(validSchema)).not.toThrow()
  })

  it('rejects a paid default character variant (free-default invariant)', () => {
    const paid = JSON.parse(JSON.stringify(validSchema))
    paid.characterLayers[0].variants[0].priceDelta = 500 // the default variant now costs extra
    expect(() => validatePublishableSchema(paid)).toThrow()
  })

  it('rejects a structurally invalid schema', () => {
    expect(() => validatePublishableSchema({ nope: true })).toThrow()
    expect(() => validatePublishableSchema(null)).toThrow()
  })
})

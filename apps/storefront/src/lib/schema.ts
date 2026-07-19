import { parseProductSchema, type ProductSchema } from '@gl/constructor';

/**
 * A local product until Medusa serves the real one. Runs through the engine's
 * `parseProductSchema`, so the free-default invariant is enforced here too. Asset keys are
 * public URLs the browser loads directly (placeholder art in /public/art).
 */
export const demoSchema: ProductSchema = parseProductSchema({
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
        { id: 'green', label: { pl: 'Zielony', en: 'Green', uk: 'Зелений' }, assetKey: '/art/body-green.png', priceDelta: 0 },
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
    {
      id: 'name',
      label: { pl: 'Imię', en: 'Name', uk: "Ім'я" },
      maxLen: 14,
      fonts: ['Bricolage Grotesque'],
      colors: ['#17131A'],
      placement: 'figure',
      zIndex: 100,
    },
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
});

/** The sample face used by the "insert a sample face" button (a synthetic cartoon face). */
export const SAMPLE_FACE_KEY = '/art/sample-face.png';
export const SAMPLE_PHOTO_ID = 'sample';

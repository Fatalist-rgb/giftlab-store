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
  canvasPx: { w: 360, h: 660 },
  characterLayers: [
    {
      id: 'body',
      zIndex: 10,
      label: { pl: 'Postać', en: 'Character', uk: 'Персонаж' },
      variants: [
        { id: 'stoi', label: { pl: 'Na stojąco', en: 'Standing', uk: 'Стоячи' }, assetKey: '/art/body-stoi.png', priceDelta: 0 },
        { id: 'piwo', label: { pl: 'Z kuflem piwa', en: 'With a beer', uk: 'З келихом пива' }, assetKey: '/art/body-stoi-piwo.png', priceDelta: 0 },
        { id: 'kieszen', label: { pl: 'Ręka w kieszeni', en: 'Hand in pocket', uk: 'Рука в кишені' }, assetKey: '/art/body-kieszen.png', priceDelta: 0 },
      ],
    },
  ],
  faceZone: {
    bounds: { x: 91, y: 17, w: 176, h: 240 },
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

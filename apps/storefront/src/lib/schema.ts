import { parseProductSchema, type ProductSchema } from '@gl/constructor';

/**
 * The six poses, as photographed.
 *
 * Every pose is its own photo crop, so each carries its own pixel space, its own face
 * hole and its own place for the printed name — see `variantZ.canvasPx/faceBounds/namePos`.
 * The numbers are measured off the product photography; changing a photo means
 * re-measuring, which is why they sit beside the asset key rather than in the renderer.
 *
 * `faceBounds` is the bounding box of the elliptical hole in the acrylic: the customer's
 * face is drawn UNDER the body layer's transparent window, so it can never spill past
 * the silhouette.
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
];

/**
 * A local product until Medusa serves the real one. Runs through the engine's
 * `parseProductSchema`, so the free-default invariant is enforced here too. Asset keys are
 * public URLs the browser loads directly.
 */
export const demoSchema: ProductSchema = parseProductSchema({
  id: 'ps_figurine',
  medusaProductId: 'prod_belly',
  version: 1,
  status: 'published',
  // the product-level canvas is the standing pose; every variant restates its own
  canvasPx: { w: 615, h: 1231 },
  characterLayers: [
    {
      id: 'body',
      zIndex: 10,
      label: { pl: 'Postać', en: 'Character', uk: 'Персонаж' },
      variants: POSE_VARIANTS,
    },
  ],
  faceZone: {
    bounds: { x: 152, y: 62, w: 300, h: 410 },
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
      // printed white with an ink outline — it has to read on skin and on a dark shirt
      colors: ['#FFFFFF'],
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

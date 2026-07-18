import type { DesignState } from '../src/design-state/types.js';

/** A valid rev-3 product: one size (11 cm), magnet, every option free, price by quantity. */
export const rawSchema = {
  id: 'ps_figurine',
  medusaProductId: 'prod_belly',
  version: 1,
  status: 'published',
  canvasPx: { w: 304, h: 424 },
  characterLayers: [
    {
      id: 'body',
      zIndex: 10,
      label: { pl: 'Sylwetka' },
      variants: [
        { id: 'robert', label: { pl: 'Robert' }, assetKey: 'art/robert.png', priceDelta: 0 },
        { id: 'steve', label: { pl: 'Steve' }, assetKey: 'art/steve.png', priceDelta: 0 },
      ],
    },
  ],
  faceZone: {
    bounds: { x: 88, y: 24, w: 120, h: 132 },
    maskAssetKey: 'art/face-mask.svg',
    minResolutionPx: { w: 900, h: 900 },
    transforms: ['move', 'scale', 'rotate'],
    zIndex: 15,
  },
  textFields: [
    {
      id: 'name',
      label: { pl: 'Imię' },
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
};

/** Same product, but the default (first) body variant carries a surcharge — illegal. */
export const rawSchemaPaidDefault = {
  ...rawSchema,
  characterLayers: [
    {
      ...rawSchema.characterLayers[0],
      variants: [
        { id: 'robert', assetKey: 'art/robert.png', priceDelta: 500 },
        { id: 'steve', assetKey: 'art/steve.png', priceDelta: 0 },
      ],
    },
  ],
};

export function makeDesign(overrides: Partial<DesignState> = {}): DesignState {
  return {
    productSchemaId: 'ps_figurine',
    schemaVersion: 1,
    characterSelections: { body: 'robert' },
    faceLayer: { uploadedPhotoId: 'up_1', x: 0, y: 0, scale: 1, rotation: 0 },
    textValues: [],
    selectedOptions: {},
    quantity: 1,
    photoStatus: 'ready',
    ...overrides,
  };
}

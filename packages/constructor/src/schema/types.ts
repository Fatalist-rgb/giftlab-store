import { z } from 'zod';

/**
 * Product Schema — the versioned definition of what a personalizable product allows.
 * Mirrors contracts/constructor-schema.md (rev 3): character layers the customer picks,
 * a face zone that takes only their (background-removed) face, free options, a fixed
 * physical spec, quantity-based pricing, and the cut contour. Zod is the single source
 * of truth; the TypeScript types are inferred from it.
 */

export const localizedTextZ = z.record(z.string());
export type LocalizedText = z.infer<typeof localizedTextZ>;

export const variantZ = z.object({
  id: z.string().min(1),
  label: localizedTextZ.optional(),
  assetKey: z.string().min(1),
  priceDelta: z.number().int().default(0),
});
export type Variant = z.infer<typeof variantZ>;

export const characterLayerZ = z.object({
  id: z.string().min(1),
  label: localizedTextZ.optional(),
  zIndex: z.number().int(),
  variants: z.array(variantZ).min(1),
});
export type CharacterLayer = z.infer<typeof characterLayerZ>;

export const faceZoneZ = z.object({
  bounds: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
  }),
  maskAssetKey: z.string().min(1),
  minResolutionPx: z.object({
    w: z.number().int().positive(),
    h: z.number().int().positive(),
  }),
  transforms: z.array(z.enum(['move', 'scale', 'rotate'])).default([]),
  // where the face sits in the layer stack (under the top acrylic outline, above the body)
  zIndex: z.number().int().default(50),
});
export type FaceZone = z.infer<typeof faceZoneZ>;

export const textFieldZ = z.object({
  id: z.string().min(1),
  label: localizedTextZ.optional(),
  maxLen: z.number().int().positive(),
  fonts: z.array(z.string()).min(1),
  colors: z.array(z.string()).min(1),
  placement: z.string().default('figure'),
  zIndex: z.number().int().default(100),
});
export type TextField = z.infer<typeof textFieldZ>;

export const optionValueZ = z.object({
  id: z.string().min(1),
  label: localizedTextZ.optional(),
  priceDelta: z.number().int().default(0),
});
export type OptionValue = z.infer<typeof optionValueZ>;

export const optionZ = z.object({
  id: z.string().min(1),
  label: localizedTextZ.optional(),
  values: z.array(optionValueZ).min(1),
  default: z.string().optional(),
});
export type ProductOption = z.infer<typeof optionZ>;

export const quantityTierZ = z.object({
  minQty: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
});
export type QuantityTier = z.infer<typeof quantityTierZ>;

export const pricingRulesZ = z.object({
  base: z.number().int().nonnegative(),
  currency: z.string().length(3),
  quantityLadder: z.array(quantityTierZ).min(1),
});
export type PricingRules = z.infer<typeof pricingRulesZ>;

export const physicalZ = z.object({
  heightMm: z.number().positive(),
  magneticBacking: z.boolean().default(false),
  material: z.string().optional(),
});
export type Physical = z.infer<typeof physicalZ>;

export const cutContourZ = z.object({
  source: z.enum(['composite', 'silhouette', 'asset']).default('composite'),
  offsetMm: z.number().nonnegative().default(3),
  spotName: z.string().default('CutContour'),
});
export type CutContour = z.infer<typeof cutContourZ>;

export const productSchemaZ = z.object({
  id: z.string().min(1),
  medusaProductId: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(['draft', 'published', 'archived']),
  // native pixel dimensions of the artwork — the coordinate space faceZone/text live in
  canvasPx: z.object({ w: z.number().int().positive(), h: z.number().int().positive() }),
  characterLayers: z.array(characterLayerZ).min(1),
  faceZone: faceZoneZ,
  textFields: z.array(textFieldZ).default([]),
  options: z.array(optionZ).default([]),
  physical: physicalZ,
  constraints: z.object({ rules: z.array(z.unknown()).default([]) }).default({ rules: [] }),
  pricingRules: pricingRulesZ,
  cutContour: cutContourZ,
});
export type ProductSchema = z.infer<typeof productSchemaZ>;

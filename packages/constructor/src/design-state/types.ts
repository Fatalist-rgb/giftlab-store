import { z } from 'zod';

/** One customer's configuration against a specific ProductSchema version. */

export const faceLayerZ = z.object({
  uploadedPhotoId: z.string().min(1),
  x: z.number(),
  y: z.number(),
  scale: z.number().positive(),
  rotation: z.number(),
});
export type FaceLayer = z.infer<typeof faceLayerZ>;

export const textValueZ = z.object({
  fieldId: z.string().min(1),
  value: z.string(),
  font: z.string().optional(),
  color: z.string().optional(),
});
export type TextValue = z.infer<typeof textValueZ>;

export const photoStatusZ = z.enum(['ready', 'deferred', 'processing', 'failed']);
export type PhotoStatus = z.infer<typeof photoStatusZ>;

export const designStateZ = z.object({
  productSchemaId: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  /** layerId -> variantId */
  characterSelections: z.record(z.string()),
  /** null while the customer defers the photo (order now, send it later) */
  faceLayer: faceLayerZ.nullable(),
  textValues: z.array(textValueZ).default([]),
  /** optionId -> valueId (empty for this product — every option is free) */
  selectedOptions: z.record(z.string()).default({}),
  quantity: z.number().int().positive().default(1),
  photoStatus: photoStatusZ.default('ready'),
});
export type DesignState = z.infer<typeof designStateZ>;

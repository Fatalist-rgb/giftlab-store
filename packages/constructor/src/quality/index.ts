import type { ProductSchema } from '../schema/types.js';

export interface PhotoInput {
  width: number;
  height: number;
}

export interface PhotoAssessment {
  ok: boolean;
  warning?: 'resolution_low';
}

/**
 * Assess an uploaded photo against the schema's minimum print resolution. It WARNS,
 * it never blocks (FR-004): a shortfall fires at peak purchase intent and, since the
 * configurator is the customer's labour, a block that throws it away kills the sale.
 * The UI must surface a remedy; it must not gate checkout.
 */
export function assessPhoto(photo: PhotoInput, schema: ProductSchema): PhotoAssessment {
  const min = schema.faceZone.minResolutionPx;
  if (photo.width < min.w || photo.height < min.h) {
    return { ok: false, warning: 'resolution_low' };
  }
  return { ok: true };
}

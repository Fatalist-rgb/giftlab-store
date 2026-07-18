import type { Scene } from '../render/types.js';
import type { ProductSchema } from '../schema/types.js';

export interface CutPath {
  /** how the physical cut line is derived */
  basis: 'composite' | 'silhouette' | 'asset';
  /** outward offset from the artwork edge, in millimetres (bleed for the blade) */
  offsetMm: number;
  /** spot-colour name the print shop keys the cut layer on */
  spotName: string;
  /** artwork the silhouette is traced from, in paint order */
  sourceAssetKeys: string[];
}

/**
 * Describe the cut contour for a resolved scene. The exact vector path is traced from the
 * rasterised silhouette by the render worker (a pixel operation); this keeps the engine
 * pure and hands the worker everything it needs: the basis, the bleed offset, the spot
 * name, and which artwork forms the outline.
 */
export function buildCutContour(schema: ProductSchema, scene: Scene): CutPath {
  const sourceAssetKeys = scene.nodes
    .filter((n): n is Extract<typeof n, { kind: 'image' }> => n.kind === 'image')
    .map((n) => n.assetKey);

  return {
    basis: schema.cutContour.source,
    offsetMm: schema.cutContour.offsetMm,
    spotName: schema.cutContour.spotName,
    sourceAssetKeys,
  };
}

import type { ProductSchema } from '../schema/types.js';
import type { Ctx2D, ImageLike, MakeCanvas } from './context.js';
import { drawScene } from './draw.js';
import type { Scene } from './types.js';

export interface BrowserRenderOptions<Img extends ImageLike> {
  schema: ProductSchema;
  /** assetKey / photoId / maskAssetKey -> a decoded HTMLImageElement / ImageBitmap */
  assets: ReadonlyMap<string, Img>;
  scale?: number;
}

/**
 * Render a Scene into a DOM canvas for the live preview. Uses the SAME `drawScene` as the
 * server, so what the customer sees is what gets printed. No native dependency — safe to
 * bundle for the storefront.
 */
export function renderSceneToCanvas<Img extends ImageLike>(
  canvas: HTMLCanvasElement,
  scene: Scene,
  opts: BrowserRenderOptions<Img>,
): void {
  const scale = opts.scale ?? 1;
  canvas.width = Math.max(1, Math.round(opts.schema.canvasPx.w * scale));
  canvas.height = Math.max(1, Math.round(opts.schema.canvasPx.h * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context unavailable');

  const makeCanvas: MakeCanvas = (w, h) => {
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(w));
    off.height = Math.max(1, Math.round(h));
    const offCtx = off.getContext('2d');
    if (!offCtx) throw new Error('2d canvas context unavailable');
    return { ctx: offCtx as unknown as Ctx2D, drawable: off };
  };

  drawScene(ctx as unknown as Ctx2D, scene, {
    schema: opts.schema,
    assets: opts.assets,
    scale,
    makeCanvas,
  });
}

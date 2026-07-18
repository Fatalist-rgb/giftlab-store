import { createCanvas, loadImage, type Image } from '@napi-rs/canvas';
import type { ProductSchema } from '../schema/types.js';
import type { Ctx2D, MakeCanvas } from './context.js';
import { drawScene } from './draw.js';
import type { Scene } from './types.js';

export interface ServerRenderOptions {
  schema: ProductSchema;
  /** assetKey / photoId / maskAssetKey -> raw image bytes (PNG/JPEG) */
  assetBytes: ReadonlyMap<string, Uint8Array>;
  /** artwork px -> output px; e.g. targetDpi helper below */
  scale?: number;
}

/**
 * Render a Scene to a PNG buffer on the server (render worker). Uses @napi-rs/canvas
 * (Skia) and the SAME `drawScene` the browser preview uses, so the production file is the
 * customer's approved design at print resolution. Deterministic: same input → same bytes.
 */
export async function renderScenePng(scene: Scene, opts: ServerRenderOptions): Promise<Buffer> {
  const scale = opts.scale ?? 1;
  const w = Math.max(1, Math.round(opts.schema.canvasPx.w * scale));
  const h = Math.max(1, Math.round(opts.schema.canvasPx.h * scale));

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const assets = new Map<string, Image>();
  for (const [key, bytes] of opts.assetBytes) {
    assets.set(key, await loadImage(Buffer.from(bytes)));
  }

  const makeCanvas: MakeCanvas = (cw, ch) => {
    const off = createCanvas(Math.max(1, Math.round(cw)), Math.max(1, Math.round(ch)));
    return { ctx: off.getContext('2d') as unknown as Ctx2D, drawable: off };
  };

  drawScene(ctx as unknown as Ctx2D, scene, { schema: opts.schema, assets, scale, makeCanvas });
  return canvas.toBuffer('image/png');
}

/**
 * Scale that renders the artwork at `dpi`, given the figure's real height (mm). Keeps the
 * production file at true print resolution regardless of the artwork's authored size.
 */
export function scaleForDpi(schema: ProductSchema, dpi = 300): number {
  const heightInches = schema.physical.heightMm / 25.4;
  const targetPx = heightInches * dpi;
  return targetPx / schema.canvasPx.h;
}

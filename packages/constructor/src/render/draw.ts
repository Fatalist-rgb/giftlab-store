import type { ProductSchema } from '../schema/types.js';
import type { Ctx2D, ImageLike, MakeCanvas } from './context.js';
import type { Scene, SceneFaceNode, SceneTextNode } from './types.js';

export interface DrawOptions<Img extends ImageLike> {
  schema: ProductSchema;
  /** assetKey / photoId / maskAssetKey -> a drawable image */
  assets: ReadonlyMap<string, Img>;
  /** artwork px -> output px (e.g. 2.95 to reach 300 DPI on an 11 cm figure) */
  scale?: number;
  /** offscreen factory — enables the elliptical face mask; without it the face is box-clipped */
  makeCanvas?: MakeCanvas;
}

const DEG = Math.PI / 180;

/**
 * Paint a resolved Scene onto a 2D context. PURE apart from the pixels it writes: no
 * Date, no randomness, no I/O. Same (scene, assets, scale) → same pixels in the browser
 * and on the server (Constitution II). The renderer adds nothing the Scene did not fix.
 */
export function drawScene<Img extends ImageLike>(
  ctx: Ctx2D,
  scene: Scene,
  opts: DrawOptions<Img>,
): void {
  const scale = opts.scale ?? 1;
  const cw = opts.schema.canvasPx.w * scale;
  const ch = opts.schema.canvasPx.h * scale;
  ctx.clearRect(0, 0, cw, ch);

  for (const node of scene.nodes) {
    switch (node.kind) {
      case 'image': {
        const img = opts.assets.get(node.assetKey);
        if (img) ctx.drawImage(img, 0, 0, cw, ch); // each layer is authored full-canvas
        break;
      }
      case 'face':
        drawFace(ctx, node, opts, scale);
        break;
      case 'text':
        drawText(ctx, node, cw, ch, scale);
        break;
    }
  }
}

function drawFace<Img extends ImageLike>(
  ctx: Ctx2D,
  node: SceneFaceNode,
  opts: DrawOptions<Img>,
  scale: number,
): void {
  if (node.placeholder || node.photoId === null) return;
  const face = opts.assets.get(node.photoId);
  if (!face) return;

  const b = node.bounds;
  const bx = b.x * scale;
  const by = b.y * scale;
  const bw = b.w * scale;
  const bh = b.h * scale;
  const mask = opts.assets.get(node.maskAssetKey);

  if (mask && opts.makeCanvas) {
    // composite the face on an offscreen so the mask trims ONLY the face, then stamp it in
    const off = opts.makeCanvas(bw, bh);
    paintFace(off.ctx, face, node, bw, bh, scale);
    off.ctx.globalCompositeOperation = 'destination-in';
    off.ctx.drawImage(mask, 0, 0, bw, bh);
    off.ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(off.drawable, bx, by, bw, bh);
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
    ctx.clip();
    ctx.translate(bx, by);
    paintFace(ctx, face, node, bw, bh, scale);
    ctx.restore();
  }
}

/** Cover-fit the face into a w×h box and apply the customer's move/scale/rotate. */
function paintFace<Img extends ImageLike>(
  ctx: Ctx2D,
  face: Img,
  node: SceneFaceNode,
  w: number,
  h: number,
  scale: number,
): void {
  const cover = Math.max(w / face.width, h / face.height);
  const s = cover * node.transform.scale;
  const fw = face.width * s;
  const fh = face.height * s;
  ctx.save();
  ctx.translate(w / 2 + node.transform.x * scale, h / 2 + node.transform.y * scale);
  ctx.rotate(node.transform.rotation * DEG);
  ctx.drawImage(face, -fw / 2, -fh / 2, fw, fh);
  ctx.restore();
}

function drawText(ctx: Ctx2D, node: SceneTextNode, cw: number, ch: number, scale: number): void {
  ctx.save();
  ctx.fillStyle = node.color;
  ctx.font = `700 ${Math.round(26 * scale)}px ${node.font}, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // name band on the figure, lower third — a deterministic placement the schema can refine
  ctx.fillText(node.value, cw * 0.5, ch * 0.62);
  ctx.restore();
}

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
  // the scene owns its pixel space: the selected pose decides it, not the product
  const cw = scene.canvas.w * scale;
  const ch = scene.canvas.h * scale;
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

/**
 * The name is printed ON the figurine, so it is sized against the ARTWORK, never
 * against the output DPI: a share of the canvas width, shrinking as the name gets
 * longer so 14 characters still fit across a shoulder. Same curve the approved design
 * uses (10% of the width down to 3.4%).
 */
function nameSize(value: string, cw: number): number {
  const n = value.length;
  if (!n) return 0;
  return (Math.max(3.4, Math.min(10, 42 / (n * 0.52))) / 100) * cw;
}

function drawText(ctx: Ctx2D, node: SceneTextNode, cw: number, ch: number, scale: number): void {
  const size = nameSize(node.value, cw);
  if (size <= 0) return;

  ctx.save();
  ctx.font = `700 ${size}px ${node.font}, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (node.anchor) {
    // the pose says where the name goes — along the shoulder, tilted with the body
    ctx.translate(node.anchor.x * scale, node.anchor.y * scale);
    ctx.rotate(node.anchor.rot * DEG);
    strokeThenFill(ctx, node.value, 0, 0, size, node.color);
  } else {
    // no anchor: the lower-third band, the deterministic default
    strokeThenFill(ctx, node.value, cw * 0.5, ch * 0.62, size, node.color);
  }
  ctx.restore();
}

/** Ink outline under the fill, so the name reads on skin, on a shirt or on a beer. */
function strokeThenFill(ctx: Ctx2D, value: string, x: number, y: number, size: number, color: string): void {
  ctx.lineWidth = size * 0.2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#17131A';
  ctx.strokeText(value, x, y);
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

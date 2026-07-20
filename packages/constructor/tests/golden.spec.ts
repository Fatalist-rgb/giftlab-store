import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { buildScene, parseProductSchema, type DesignState } from '../src/index.js';
import { renderScenePng } from '../src/render/server.js';

/**
 * Golden-image fidelity test (T029, Principle II). The engine renders a fixed design
 * with fully synthetic assets and the bundled brand font; the output must stay
 * pixel-stable against the committed golden. Because the browser preview and the server
 * renderer share the SAME drawScene, pinning the server output pins the promise
 * "preview = print" against engine drift. Tolerance absorbs skia AA jitter only.
 *
 * If the engine changes INTENTIONALLY: delete tests/__golden__/scene.png, run tests
 * once to regenerate, review the new image, commit it.
 */
const here = dirname(fileURLToPath(import.meta.url));
const goldenPath = join(here, '__golden__', 'scene.png');

const schema = parseProductSchema({
  id: 'ps_golden',
  medusaProductId: 'prod_golden',
  version: 1,
  status: 'published',
  canvasPx: { w: 304, h: 424 },
  characterLayers: [
    { id: 'body', zIndex: 10, variants: [{ id: 'a', assetKey: 'art/body.png', priceDelta: 0 }] },
  ],
  faceZone: {
    bounds: { x: 92, y: 40, w: 120, h: 132 },
    maskAssetKey: 'art/mask.png',
    minResolutionPx: { w: 900, h: 900 },
    transforms: ['move', 'scale', 'rotate'],
    zIndex: 15,
  },
  textFields: [
    { id: 'name', maxLen: 14, fonts: ['Bricolage Grotesque'], colors: ['#17131A'], placement: 'figure', zIndex: 100 },
  ],
  options: [],
  physical: { heightMm: 110, magneticBacking: true, material: 'acrylic+silicone' },
  pricingRules: { base: 7900, currency: 'PLN', quantityLadder: [{ minQty: 1, unitPrice: 7900 }] },
  cutContour: { source: 'composite', offsetMm: 3, spotName: 'CutContour' },
});

const design: DesignState = {
  productSchemaId: 'ps_golden',
  schemaVersion: 1,
  characterSelections: { body: 'a' },
  faceLayer: { uploadedPhotoId: 'face', x: 6, y: -4, scale: 1.15, rotation: 12 },
  textValues: [{ fieldId: 'name', value: 'Zosia' }],
  selectedOptions: {},
  quantity: 1,
  photoStatus: 'ready',
};

function bodyPng(): Uint8Array {
  const c = createCanvas(304, 424);
  const x = c.getContext('2d');
  x.fillStyle = '#e05d9f';
  x.beginPath();
  x.ellipse(152, 258, 100, 122, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#b23f7c';
  x.fillRect(120, 360, 26, 60);
  x.fillRect(158, 360, 26, 60);
  return new Uint8Array(c.toBuffer('image/png'));
}
function maskPng(): Uint8Array {
  const c = createCanvas(120, 132);
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.beginPath();
  x.ellipse(60, 66, 58, 64, 0, 0, Math.PI * 2);
  x.fill();
  return new Uint8Array(c.toBuffer('image/png'));
}
function facePng(): Uint8Array {
  const c = createCanvas(200, 220);
  const x = c.getContext('2d');
  x.fillStyle = '#f2c9a0';
  x.beginPath();
  x.ellipse(100, 110, 84, 100, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#17131a';
  x.beginPath();
  x.arc(70, 92, 9, 0, Math.PI * 2);
  x.arc(130, 92, 9, 0, Math.PI * 2);
  x.fill();
  return new Uint8Array(c.toBuffer('image/png'));
}

async function renderFixed(): Promise<Buffer> {
  const scene = buildScene(schema, design);
  const assetBytes = new Map<string, Uint8Array>([
    ['art/body.png', bodyPng()],
    ['art/mask.png', maskPng()],
    ['face', facePng()],
  ]);
  return renderScenePng(scene, { schema, assetBytes, scale: 1 });
}

async function diffRatio(a: Buffer, b: Buffer): Promise<number> {
  const [ia, ib] = await Promise.all([loadImage(a), loadImage(b)]);
  if (ia.width !== ib.width || ia.height !== ib.height) return 1;
  const w = ia.width;
  const h = ia.height;
  const read = (img: typeof ia) => {
    const c = createCanvas(w, h);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    return x.getImageData(0, 0, w, h).data;
  };
  const da = read(ia);
  const db = read(ib);
  let bad = 0;
  for (let i = 0; i < da.length; i += 4) {
    if (
      Math.abs(da[i]! - db[i]!) > 8 ||
      Math.abs(da[i + 1]! - db[i + 1]!) > 8 ||
      Math.abs(da[i + 2]! - db[i + 2]!) > 8 ||
      Math.abs(da[i + 3]! - db[i + 3]!) > 8
    ) {
      bad += 1;
    }
  }
  return bad / (w * h);
}

describe('golden fidelity (T029)', () => {
  it('is deterministic: two renders are byte-identical', async () => {
    const [one, two] = await Promise.all([renderFixed(), renderFixed()]);
    expect(one.equals(two)).toBe(true);
  });

  it('matches the committed golden within 0.5% of pixels', async () => {
    const png = await renderFixed();
    if (!existsSync(goldenPath)) {
      mkdirSync(dirname(goldenPath), { recursive: true });
      writeFileSync(goldenPath, png);
      console.warn('golden bootstrapped — review tests/__golden__/scene.png and commit it');
      return;
    }
    const golden = readFileSync(goldenPath);
    const ratio = await diffRatio(png, golden);
    expect(ratio).toBeLessThan(0.005);
  });
});

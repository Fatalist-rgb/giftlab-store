import { parseProductSchema, type DesignState } from '@gl/constructor';
import { createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { buildProductionPackage } from '../src/package/build.js';

const schema = parseProductSchema({
  id: 'ps_figurine',
  medusaProductId: 'prod_belly',
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
});

const design: DesignState = {
  productSchemaId: 'ps_figurine',
  schemaVersion: 1,
  characterSelections: { body: 'a' },
  faceLayer: { uploadedPhotoId: 'up_1', x: 0, y: 0, scale: 1, rotation: 0 },
  textValues: [{ fieldId: 'name', value: 'KUBA' }],
  selectedOptions: {},
  quantity: 1,
  photoStatus: 'ready',
};

function figureBody(): Uint8Array {
  const c = createCanvas(304, 424);
  const x = c.getContext('2d');
  x.fillStyle = '#3aa06a';
  x.beginPath();
  x.ellipse(152, 260, 96, 120, 0, 0, Math.PI * 2); // opaque body on a transparent canvas
  x.fill();
  return new Uint8Array(c.toBuffer('image/png'));
}
function ellipseMask(): Uint8Array {
  const c = createCanvas(120, 132);
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.beginPath();
  x.ellipse(60, 66, 60, 66, 0, 0, Math.PI * 2);
  x.fill();
  return new Uint8Array(c.toBuffer('image/png'));
}
function faceTile(): Uint8Array {
  const c = createCanvas(200, 200);
  const x = c.getContext('2d');
  x.fillStyle = '#eeccaa';
  x.fillRect(0, 0, 200, 200);
  return new Uint8Array(c.toBuffer('image/png'));
}
const assets = () =>
  new Map<string, Uint8Array>([
    ['art/body.png', figureBody()],
    ['art/mask.png', ellipseMask()],
    ['up_1', faceTile()],
  ]);

const pngDims = (b: Buffer) => ({ w: b.readUInt32BE(16), h: b.readUInt32BE(20) });

describe('buildProductionPackage', () => {
  it('renders a print PNG at true 300 DPI (110 mm)', async () => {
    const pkg = await buildProductionPackage({ schema, design, assetBytes: assets() });
    expect(pkg.printPng.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(pngDims(pkg.printPng).h).toBe(1299);
    expect(pkg.meta.dpi).toBe(300);
  });

  it('traces a closed cut contour as the CutContour spot layer', async () => {
    const pkg = await buildProductionPackage({ schema, design, assetBytes: assets() });
    expect(pkg.cutSvg).toContain('<svg');
    expect(pkg.cutSvg).toContain('<path');
    expect(pkg.cutSvg).toContain('data-spot="CutContour"');
    expect(pkg.cutSvg).toMatch(/ Z"/);
    expect(pkg.cutSvg.trim().endsWith('</svg>')).toBe(true);
  });

  it('writes a spec with the per-line withdrawal verdict and price', async () => {
    const pkg = await buildProductionPackage({ schema, design, assetBytes: assets() });
    const spec = JSON.parse(pkg.specJson);
    expect(spec.legal.withdrawalRight).toBe('excluded');
    expect(spec.print.dpi).toBe(300);
    expect(spec.price.unitPrice).toBe(7900);
    expect(spec.physical.magneticBacking).toBe(true);
  });

  it('emits a web preview at the authored size', async () => {
    const pkg = await buildProductionPackage({ schema, design, assetBytes: assets() });
    expect(pngDims(pkg.previewPng)).toEqual({ w: 304, h: 424 });
  });

  it('is deterministic — same design, same package (Constitution II)', async () => {
    const a = await buildProductionPackage({ schema, design, assetBytes: assets() });
    const b = await buildProductionPackage({ schema, design, assetBytes: assets() });
    expect(a.printPng.equals(b.printPng)).toBe(true);
    expect(a.cutSvg).toBe(b.cutSvg);
    expect(a.specJson).toBe(b.specJson);
  });

  it('keeps the withdrawal right for a non-personalized line', async () => {
    const plain: DesignState = { ...design, faceLayer: null, photoStatus: 'failed', textValues: [] };
    const pkg = await buildProductionPackage({ schema, design: plain, assetBytes: assets() });
    expect(JSON.parse(pkg.specJson).legal.withdrawalRight).toBe('applies');
  });
});

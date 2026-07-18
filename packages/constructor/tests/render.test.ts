import { createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { renderScenePng, scaleForDpi } from '../src/render/server.js';
import { buildScene } from '../src/render/scene.js';
import { parseProductSchema } from '../src/schema/validate.js';
import { makeDesign, rawSchema } from './fixtures.js';

const schema = parseProductSchema(rawSchema);

function solidPng(w: number, h: number, color: string): Uint8Array {
  const c = createCanvas(w, h);
  const x = c.getContext('2d');
  x.fillStyle = color;
  x.fillRect(0, 0, w, h);
  return new Uint8Array(c.toBuffer('image/png'));
}

function ellipseMask(w: number, h: number): Uint8Array {
  const c = createCanvas(w, h);
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  x.fill();
  return new Uint8Array(c.toBuffer('image/png'));
}

function assets(): Map<string, Uint8Array> {
  return new Map([
    ['art/robert.png', solidPng(304, 424, '#33bb66')],
    ['art/steve.png', solidPng(304, 424, '#3399cc')],
    ['art/face-mask.svg', ellipseMask(120, 132)],
    ['up_1', solidPng(200, 200, '#eeccaa')],
  ]);
}

function pngDims(buf: Buffer): { w: number; h: number } {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

describe('renderScenePng — server production render', () => {
  it('renders a valid PNG at the artwork size', async () => {
    const scene = buildScene(schema, makeDesign());
    const png = await renderScenePng(scene, { schema, assetBytes: assets(), scale: 1 });
    expect(png.length).toBeGreaterThan(100);
    expect(png[0]).toBe(0x89);
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(pngDims(png)).toEqual({ w: 304, h: 424 });
  });

  it('is deterministic — same design renders byte-identical bytes (Constitution II)', async () => {
    const scene = buildScene(schema, makeDesign());
    const a = await renderScenePng(scene, { schema, assetBytes: assets(), scale: 1 });
    const b = await renderScenePng(scene, { schema, assetBytes: assets(), scale: 1 });
    expect(a.equals(b)).toBe(true);
  });

  it('scales the output for higher resolution', async () => {
    const scene = buildScene(schema, makeDesign());
    const png = await renderScenePng(scene, { schema, assetBytes: assets(), scale: 2 });
    expect(pngDims(png)).toEqual({ w: 608, h: 848 });
  });

  it('renders a deferred design without a face (placeholder)', async () => {
    const scene = buildScene(schema, makeDesign({ faceLayer: null, photoStatus: 'deferred' }));
    const png = await renderScenePng(scene, { schema, assetBytes: assets(), scale: 1 });
    expect(pngDims(png)).toEqual({ w: 304, h: 424 });
  });

  it('scaleForDpi targets true print resolution (11 cm at 300 DPI ≈ 1299 px)', () => {
    const s = scaleForDpi(schema, 300);
    expect(Math.round(schema.canvasPx.h * s)).toBe(1299);
  });
});

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Lays the client's figurine renders onto ONE shared canvas for the constructor.
 *
 * A product schema carries a single faceZone for all of its variants, so the poses have
 * to be aligned to each other: every body is scaled until its head opening is the same
 * width, then positioned so that opening lands on the same spot. The result is that a
 * customer switching pose sees their face stay exactly where it was.
 */
const IN = process.argv[2];   // folder with <id>.png + geometry.json from prep-bodies
const OUT = process.argv[3];  // where the final artwork goes
const IDS = process.argv.slice(4);

const geo = JSON.parse(readFileSync(`${IN}/geometry.json`, 'utf8'));
const picked = IDS.map((id) => {
  const g = geo.find((x) => x.id === id);
  if (!g) throw new Error(`no geometry for ${id}`);
  return g;
});

// one head size for every pose; the widest head decides the common scale
const headTarget = Math.max(...picked.map((g) => g.faceZone.w));
const scales = picked.map((g) => headTarget / g.faceZone.w);

// place every body with its head centre at the origin, then measure how far each
// stretches — the union of those extents is the canvas every variant shares
let left = 0, right = 0, top = 0, bottom = 0;
picked.forEach((g, i) => {
  const s = scales[i];
  const cx = (g.faceZone.x + g.faceZone.w / 2) * s;
  const cy = (g.faceZone.y + g.faceZone.h / 2) * s;
  left = Math.min(left, -cx);
  right = Math.max(right, g.canvas.w * s - cx);
  top = Math.min(top, -cy);
  bottom = Math.max(bottom, g.canvas.h * s - cy);
});

const margin = Math.round(headTarget * 0.06);
const canvasW = Math.round(right - left) + margin * 2;
const canvasH = Math.round(bottom - top) + margin * 2;
const headCx = Math.round(-left) + margin;
const headCy = Math.round(-top) + margin;

// the schema works in a modest pixel space (the print raster is rendered at a multiple
// of it), so scale the whole thing down to a sane canvas width
const FINAL_W = 360;
const k = FINAL_W / canvasW;
const finalW = Math.round(canvasW * k);
const finalH = Math.round(canvasH * k);
const faceZone = {
  x: Math.round((headCx - headTarget / 2) * k),
  y: Math.round((headCy - (picked[0].faceZone.h * scales[0]) / 2) * k),
  w: Math.round(headTarget * k),
  h: Math.round(picked[0].faceZone.h * scales[0] * k),
};

for (let i = 0; i < picked.length; i++) {
  const g = picked[i];
  const s = scales[i] * k;
  const body = await sharp(`${IN}/${g.id}.png`)
    .resize({ width: Math.max(1, Math.round(g.canvas.w * s)), height: Math.max(1, Math.round(g.canvas.h * s)) })
    .png()
    .toBuffer();
  const cx = (g.faceZone.x + g.faceZone.w / 2) * s;
  const cy = (g.faceZone.y + g.faceZone.h / 2) * s;
  const canvas = await sharp({
    create: { width: finalW, height: finalH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: body, left: Math.round(faceZone.x + faceZone.w / 2 - cx), top: Math.round(faceZone.y + faceZone.h / 2 - cy) }])
    .png()
    .toBuffer();
  writeFileSync(`${OUT}/${g.id}.png`, canvas);

  // proof: the shared face zone drawn over each pose
  const marker = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${finalW}" height="${finalH}">
       <ellipse cx="${faceZone.x + faceZone.w / 2}" cy="${faceZone.y + faceZone.h / 2}"
                rx="${faceZone.w / 2}" ry="${faceZone.h / 2}"
                fill="rgba(255,106,43,.22)" stroke="#FF6A2B" stroke-width="3"/>
     </svg>`,
  );
  writeFileSync(
    `${OUT}/${g.id}.check.png`,
    await sharp(canvas).composite([{ input: marker }]).flatten({ background: '#ffffff' }).png().toBuffer(),
  );
  console.log(g.id.padEnd(11), `${finalW}x${finalH}`);
}

console.log('\ncanvasPx', JSON.stringify({ w: finalW, h: finalH }));
console.log('faceZone', JSON.stringify(faceZone));
writeFileSync(`${OUT}/schema-geometry.json`, JSON.stringify({ canvasPx: { w: finalW, h: finalH }, faceZone }, null, 2));

import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * Turns the client's headless figurine renders into constructor artwork.
 *
 * Each render stops at the neck, so the face has nowhere to sit: the script measures the
 * silhouette (neck stub, shoulder width), grows the canvas upward by exactly one head,
 * and reports the ellipse the customer's face has to land in. Output is a transparent
 * PNG plus its geometry — the two things both the demo and the real schema need.
 */
const SRC = 'C:/Users/Fatalist/Desktop/Belly beer/';
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });

const BODIES = [
  { id: 'stoi',        file: 'ChatGPT Image 5 авг. 2026 г., 22_52_47.png', white: false },
  { id: 'stoi-piwo',   file: 'ChatGPT Image 5 авг. 2026 г., 22_46_49.png', white: false },
  { id: 'kieszen',     file: 'ChatGPT Image 5 авг. 2026 г., 22_35_12.png', white: false },
  { id: 'szorty',      file: 'ChatGPT Image 4 авг. 2026 г., 13_23_16.png', white: true },
  { id: 'kufel',       file: 'ChatGPT Image 5 авг. 2026 г., 22_32_35.png', white: false },
  { id: 'lezy',        file: 'ChatGPT Image 5 авг. 2026 г., 22_19_07.png', white: false },
  { id: 'lezy-piwo',   file: 'ChatGPT Image 5 авг. 2026 г., 22_21_45.png', white: false },
];

/** white background -> alpha (the AI renders that came without one) */
async function ensureAlpha(input, white) {
  const img = sharp(input).ensureAlpha();
  if (!white) return img.png().toBuffer();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    // near-white and near-neutral = background; the acrylic rim is grey enough to survive
    if (r > 244 && g > 244 && b > 244 && Math.max(r, g, b) - Math.min(r, g, b) < 8) data[i + 3] = 0;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** rows of the alpha mask: [firstOpaqueX, lastOpaqueX, count] */
function profile(data, info) {
  const rows = [];
  for (let y = 0; y < info.height; y++) {
    let first = -1, last = -1, n = 0;
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 128) {
        if (first < 0) first = x;
        last = x; n++;
      }
    }
    rows.push([first, last, n]);
  }
  return rows;
}

const report = [];

for (const b of BODIES) {
  const withAlpha = await ensureAlpha(SRC + b.file, b.white);
  // trim the empty margins so every body starts from its own bounding box
  const trimmed = await sharp(withAlpha).trim({ threshold: 1 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const { data, info } = await sharp(trimmed).raw().toBuffer({ resolveWithObject: true });
  const rows = profile(data, info);

  const bodyW = info.width, bodyH = info.height;
  const lying = bodyW > bodyH * 1.25;

  // Where does the head go? Measured from the silhouette, not guessed:
  //  - the TOP BAND is the flat cut where the neck ends — its x-range gives the centre;
  //  - a cartoon head is ~0.62 of the shoulders (standing) or ~0.55 of the torso depth
  //    (lying, where a horizontal "shoulder width" would be the body's whole length).
  const bodyTop = rows.findIndex((r) => r[2] > 6);
  const bandH = Math.max(3, Math.round(bodyH * 0.08));
  let bx0 = Infinity, bx1 = -Infinity;
  for (let y = bodyTop; y < bodyTop + bandH; y++) {
    const [first, last, n] = rows[y] || [];
    if (n > 6) { bx0 = Math.min(bx0, first); bx1 = Math.max(bx1, last); }
  }
  if (!isFinite(bx0)) { bx0 = 0; bx1 = bodyW; }

  let shoulderW = 0;
  for (let y = bodyTop; y < Math.round(bodyH * 0.5); y++) {
    const [first, last, n] = rows[y] || [];
    if (n > 6) shoulderW = Math.max(shoulderW, last - first);
  }

  const headW = Math.round(lying ? bodyH * 0.55 : shoulderW * 0.62);
  const headH = Math.round(headW * 1.12);
  const faceCxLocal = lying ? bx0 + (bx1 - bx0) * 0.45 : (bx0 + bx1) / 2;

  // grow the canvas upward so the head fits above the neck (heads overlap the neck a bit)
  const pad = Math.round(headH * 0.92);
  const canvasW = bodyW, canvasH = bodyH + pad;
  const canvas = await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: trimmed, left: 0, top: pad }])
    .png()
    .toBuffer();

  const faceCx = Math.round(faceCxLocal);
  const faceCy = Math.round(pad + bodyTop - headH * 0.32);
  const zone = {
    x: Math.round(faceCx - headW / 2),
    y: Math.round(faceCy - headH / 2),
    w: headW,
    h: headH,
  };

  writeFileSync(`${OUT}/${b.id}.png`, canvas);

  // a proof sheet: the same art with the face ellipse drawn on top
  const marker = Buffer.from(
    `<svg width="${canvasW}" height="${canvasH}">
       <ellipse cx="${faceCx}" cy="${faceCy}" rx="${headW / 2}" ry="${headH / 2}"
                fill="rgba(255,106,43,.25)" stroke="#FF6A2B" stroke-width="6"/>
     </svg>`,
  );
  writeFileSync(
    `${OUT}/${b.id}.check.png`,
    await sharp(canvas).composite([{ input: marker }]).flatten({ background: '#ffffff' }).png().toBuffer(),
  );

  report.push({ id: b.id, canvas: { w: canvasW, h: canvasH }, faceZone: zone, lying, shoulderW });
  console.log(b.id.padEnd(11), `${canvasW}x${canvasH}`, 'face', JSON.stringify(zone), lying ? '(lying)' : '');
}

writeFileSync(`${OUT}/geometry.json`, JSON.stringify(report, null, 2));
console.log('\ngeometry ->', OUT + '/geometry.json');

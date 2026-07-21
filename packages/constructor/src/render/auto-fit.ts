/**
 * Initial face placement from a detected face box. The renderer cover-fits the photo
 * into the face zone (see paintFace), which centres the MIDDLE of the photo — for a
 * waist-up shot that lands on the chest and crops the top of the head. When a face
 * detector gives us the face bounding box, this computes the {x, y, scale} adjustment
 * that puts the WHOLE HEAD (hair included) in the zone instead. Pure math, no I/O.
 */

export interface FaceBox {
  /** face bounding box in source-photo pixels (typically eyebrows→chin) */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AutoFitInput {
  /** source photo size in pixels */
  imgW: number;
  imgH: number;
  faceBox: FaceBox;
  /** face zone size in artwork pixels (schema.faceZone.bounds) */
  zoneW: number;
  zoneH: number;
  /** clamp for the user-visible scale slider */
  minScale?: number;
  maxScale?: number;
}

export interface AutoFit {
  x: number;
  y: number;
  scale: number;
  rotation: 0;
}

// A detector's face box stops at the eyebrows/chin; a full head with hair is roughly
// twice that tall. 1.9 is tuned visually on portrait photos.
const HEAD_FACTOR = 1.9;
// leave a little air between the head and the mask edge
const HEAD_ZONE_FILL = 0.8;
// the head centre sits above the face-box centre (forehead + hair)
const HEAD_RISE = 0.18;

export function faceAutoFit(input: AutoFitInput): AutoFit {
  const { imgW, imgH, faceBox, zoneW, zoneH } = input;
  const minScale = input.minScale ?? 0.6;
  const maxScale = input.maxScale ?? 2.6;

  // paintFace: base cover fit, then the user scale multiplies it
  const cover = Math.max(zoneW / imgW, zoneH / imgH);

  // target: head height (face box × factor) fills HEAD_ZONE_FILL of the zone height
  const headH = faceBox.h * HEAD_FACTOR;
  const targetTotal = (zoneH * HEAD_ZONE_FILL) / headH;
  const scale = clamp(targetTotal / cover, minScale, maxScale);
  const total = cover * scale;

  // shift so the head centre lands on the zone centre.
  // paintFace maps photo point p to zone: zoneCenter + t + (p - imgCenter) * total
  const headCx = faceBox.x + faceBox.w / 2;
  const headCy = faceBox.y + faceBox.h / 2 - faceBox.h * HEAD_RISE;
  const x = -(headCx - imgW / 2) * total;
  const y = -(headCy - imgH / 2) * total;

  return { x: round2(x), y: round2(y), scale: round2(scale), rotation: 0 };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

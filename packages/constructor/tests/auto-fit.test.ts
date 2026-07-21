import { describe, expect, it } from 'vitest';
import { faceAutoFit } from '../src/render/auto-fit.js';

/**
 * paintFace maps a photo point p to zone coordinates as
 *   zoneCenter + t + (p - imgCenter) * (cover * scale)
 * — these tests verify the inverse: after faceAutoFit, the head centre lands on the
 * zone centre and the whole head (face box × head factor) fits inside the zone.
 */
const ZONE = { w: 120, h: 132 }; // flagship faceZone.bounds

function project(
  p: { x: number; y: number },
  img: { w: number; h: number },
  fit: { x: number; y: number; scale: number },
) {
  const cover = Math.max(ZONE.w / img.w, ZONE.h / img.h);
  const total = cover * fit.scale;
  return {
    x: ZONE.w / 2 + fit.x + (p.x - img.w / 2) * total,
    y: ZONE.h / 2 + fit.y + (p.y - img.h / 2) * total,
  };
}

describe('faceAutoFit', () => {
  it('centres the head of a waist-up portrait (face in the upper third)', () => {
    const img = { w: 1000, h: 1500 };
    const faceBox = { x: 400, y: 200, w: 200, h: 260 }; // face high in the frame
    const fit = faceAutoFit({ imgW: img.w, imgH: img.h, faceBox, zoneW: ZONE.w, zoneH: ZONE.h });

    // head centre (slightly above face-box centre) must project onto the zone centre
    const headC = { x: 500, y: 330 - 260 * 0.18 };
    const projected = project(headC, img, fit);
    expect(projected.x).toBeCloseTo(ZONE.w / 2, 0);
    expect(projected.y).toBeCloseTo(ZONE.h / 2, 0);

    // the whole head (1.9 × face box) fits inside the zone with air to spare
    const cover = Math.max(ZONE.w / img.w, ZONE.h / img.h);
    const headHpx = 260 * 1.9 * cover * fit.scale;
    expect(headHpx).toBeLessThanOrEqual(ZONE.h);
    expect(headHpx).toBeGreaterThan(ZONE.h * 0.6); // and is not tiny
  });

  it('a centred selfie face needs almost no shift', () => {
    const img = { w: 900, h: 900 };
    const faceBox = { x: 300, y: 280, w: 300, h: 360 };
    const fit = faceAutoFit({ imgW: img.w, imgH: img.h, faceBox, zoneW: ZONE.w, zoneH: ZONE.h });
    expect(Math.abs(fit.x)).toBeLessThan(6);
    // slight upward compensation for hair is expected but small
    expect(Math.abs(fit.y)).toBeLessThan(20);
  });

  it('clamps scale to the slider range', () => {
    const img = { w: 4000, h: 3000 };
    // tiny face far away -> would need a huge zoom; must clamp to maxScale
    const tiny = faceAutoFit({
      imgW: img.w,
      imgH: img.h,
      faceBox: { x: 1900, y: 1400, w: 80, h: 100 },
      zoneW: ZONE.w,
      zoneH: ZONE.h,
    });
    expect(tiny.scale).toBeLessThanOrEqual(2.6);
    // face filling the whole frame -> would need shrink below cover; must clamp to minScale
    const huge = faceAutoFit({
      imgW: 500,
      imgH: 500,
      faceBox: { x: 20, y: 20, w: 460, h: 460 },
      zoneW: ZONE.w,
      zoneH: ZONE.h,
    });
    expect(huge.scale).toBeGreaterThanOrEqual(0.6);
  });

  it('rotation is always 0 — the customer rotates by hand only', () => {
    const fit = faceAutoFit({
      imgW: 800,
      imgH: 600,
      faceBox: { x: 100, y: 100, w: 200, h: 240 },
      zoneW: ZONE.w,
      zoneH: ZONE.h,
    });
    expect(fit.rotation).toBe(0);
  });
});

/**
 * Trace the cut line from a rendered composite's alpha channel. Acrylic figures are cut
 * from a flat sheet around the OUTER silhouette (the backing is solid — concavities like
 * the gap between the legs are not cut out), so a per-row left/right envelope is the right
 * shape. The bleed offset dilates it outward to give the blade its margin.
 *
 * Emits an SVG whose single path is meant to be printed as the spot colour `spotName`
 * (a separation) — a full CMYK+spot PDF is a downstream print-prep step.
 */
export function traceCutContourSvg(
  alpha: Uint8ClampedArray,
  w: number,
  h: number,
  offsetPx: number,
  spotName: string,
): string {
  const THRESH = 32;
  const left = new Int32Array(h).fill(-1);
  const right = new Int32Array(h).fill(-1);

  for (let y = 0; y < h; y++) {
    let l = -1;
    let r = -1;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if ((alpha[(row + x) * 4 + 3] ?? 0) > THRESH) {
        if (l < 0) l = x;
        r = x;
      }
    }
    left[y] = l;
    right[y] = r;
  }

  const rows: number[] = [];
  for (let y = 0; y < h; y++) if ((left[y] ?? -1) >= 0) rows.push(y);

  const margin = Math.ceil(offsetPx) + 2;
  if (rows.length < 2) {
    return svgWrap(w, h, margin, 'M 0,0', spotName);
  }

  const step = Math.max(1, Math.round(rows.length / 220));
  const pts: string[] = [];
  const push = (x: number, y: number) => pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);

  // left edge, top -> bottom
  for (let i = 0; i < rows.length; i += step) {
    const y = rows[i]!;
    push((left[y] ?? 0) - offsetPx, y);
  }
  const lastRow = rows[rows.length - 1]!;
  push((left[lastRow] ?? 0) - offsetPx, lastRow);

  // right edge, bottom -> top
  for (let i = rows.length - 1; i >= 0; i -= step) {
    const y = rows[i]!;
    push((right[y] ?? 0) + offsetPx, y);
  }
  const firstRow = rows[0]!;
  push((right[firstRow] ?? 0) + offsetPx, firstRow);

  const d = 'M ' + pts.join(' L ') + ' Z';
  return svgWrap(w, h, margin, d, spotName);
}

function svgWrap(w: number, h: number, margin: number, d: string, spotName: string): string {
  const vb = `${-margin} ${-margin} ${w + margin * 2} ${h + margin * 2}`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">`,
    `  <!-- cut layer: print this path as spot colour "${spotName}" (separation), stroke only -->`,
    `  <path d="${d}" fill="none" stroke="#EC008C" stroke-width="1" data-spot="${spotName}"/>`,
    '</svg>',
    '',
  ].join('\n');
}

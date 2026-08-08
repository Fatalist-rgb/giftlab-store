import {
  buildScene,
  computePrice,
  computeWithdrawalRight,
  type DesignState,
  type ProductSchema,
} from '@gl/constructor';
import { renderSceneCanvas, scaleForDpi } from '@gl/constructor/server';
import { traceCutContourSvg } from './cut-contour.js';

export interface ProductionPackage {
  /** 300 DPI print raster */
  printPng: Buffer;
  /** vector cut line (spot colour) traced from the print silhouette */
  cutSvg: string;
  /** downscaled web preview */
  previewPng: Buffer;
  /** machine-readable parameter specification for the print shop / admin */
  specJson: string;
  meta: {
    dpi: number;
    widthPx: number;
    heightPx: number;
    withdrawalRight: 'excluded' | 'applies';
  };
}

export interface BuildOptions {
  schema: ProductSchema;
  design: DesignState;
  /** assetKey / photoId / maskAssetKey -> raw image bytes */
  assetBytes: ReadonlyMap<string, Uint8Array>;
  dpi?: number;
}

const mmToPx = (mm: number, dpi: number) => (mm / 25.4) * dpi;

/**
 * Turn an approved design into the full manufacturing package. This is the promise
 * "every paid order yields a print-ready file" made concrete — and it runs the exact same
 * scene the customer approved through the exact same renderer, at print resolution.
 * Pure of side effects: returns the artifacts; storing them (R2) is the worker's job.
 */
export async function buildProductionPackage(opts: BuildOptions): Promise<ProductionPackage> {
  const { schema, design } = opts;
  const dpi = opts.dpi ?? 300;
  const scene = buildScene(schema, design);

  // 1. 300 DPI print render — keep the canvas to read its alpha for the cut line.
  //    The scale is measured against the SCENE's canvas: each pose is its own photo
  //    crop, so only the scene knows the pixel space that has to hit 300 DPI.
  const scale = scaleForDpi(schema, dpi, scene);
  const printCanvas = await renderSceneCanvas(scene, { schema, assetBytes: opts.assetBytes, scale });
  const printPng = printCanvas.toBuffer('image/png');

  // 2. cut contour from the print silhouette
  const ctx = printCanvas.getContext('2d');
  const image = ctx.getImageData(0, 0, printCanvas.width, printCanvas.height);
  const cutSvg = traceCutContourSvg(
    image.data,
    printCanvas.width,
    printCanvas.height,
    mmToPx(schema.cutContour.offsetMm, dpi),
    schema.cutContour.spotName,
  );

  // 3. web preview at authored size
  const previewCanvas = await renderSceneCanvas(scene, { schema, assetBytes: opts.assetBytes, scale: 1 });
  const previewPng = previewCanvas.toBuffer('image/png');

  // 4. parameter spec
  const withdrawalRight = computeWithdrawalRight(design);
  const price = computePrice(schema, [design]);
  const spec = {
    schema: { id: schema.id, version: schema.version, medusaProductId: schema.medusaProductId },
    print: {
      dpi,
      widthPx: printCanvas.width,
      heightPx: printCanvas.height,
      heightMm: schema.physical.heightMm,
    },
    cutContour: { spotName: schema.cutContour.spotName, offsetMm: schema.cutContour.offsetMm },
    physical: { magneticBacking: schema.physical.magneticBacking, material: schema.physical.material },
    design: {
      characterSelections: design.characterSelections,
      textValues: design.textValues,
      quantity: design.quantity,
      photoStatus: design.photoStatus,
    },
    legal: { withdrawalRight },
    price: { unitPrice: price.ladderUnitPrice, currency: price.currency },
  };

  return {
    printPng,
    cutSvg,
    previewPng,
    specJson: JSON.stringify(spec, null, 2),
    meta: { dpi, widthPx: printCanvas.width, heightPx: printCanvas.height, withdrawalRight },
  };
}

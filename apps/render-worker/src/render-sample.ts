import { parseProductSchema, type DesignState } from '@gl/constructor';
import { buildProductionPackage } from './package/build.js';
import { loadLocalAssets } from './assets/local.js';
import { createLocalStorage } from './storage/local.js';

/**
 * Development end-to-end check of the manufacturing promise: take the schema Medusa
 * actually publishes, render a real design through the same engine the customer previews
 * with, and write the full production package to disk for inspection.
 *
 *   MEDUSA_PUBLISHABLE_KEY=pk_... pnpm --filter render-worker render:sample
 */
const BASE = process.env.MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;
const PRODUCT_ID = process.env.MEDUSA_FIGURINE_PRODUCT_ID ?? 'prod_belly';
// asset keys are public paths ("/art/body-blue.png"), so they resolve against the public root
const ASSET_ROOT = process.env.GL_ASSET_ROOT ?? '../storefront/public';
const OUT_DIR = process.env.GL_OUT_DIR ?? './out';

const SAMPLE_FACE_KEY = '/art/sample-face.png';
const SAMPLE_PHOTO_ID = 'sample';

async function fetchSchema() {
  if (!KEY) {
    throw new Error('MEDUSA_PUBLISHABLE_KEY is required (create one in the Medusa admin)');
  }
  const res = await fetch(`${BASE}/store/gl/products/${encodeURIComponent(PRODUCT_ID)}/schema`, {
    headers: { 'x-publishable-api-key': KEY },
  });
  if (!res.ok) throw new Error(`schema fetch failed: HTTP ${res.status}`);
  const body = (await res.json()) as { schema?: unknown };
  return parseProductSchema(body.schema);
}

async function main() {
  const schema = await fetchSchema();
  const bodyLayer = schema.characterLayers[0]!;
  const variant = bodyLayer.variants[0]!;

  const design: DesignState = {
    productSchemaId: schema.id,
    schemaVersion: schema.version,
    characterSelections: { [bodyLayer.id]: variant.id },
    faceLayer: { uploadedPhotoId: SAMPLE_PHOTO_ID, x: 0, y: 0, scale: 1, rotation: 0 },
    textValues: [{ fieldId: 'name', value: 'Anna' }],
    selectedOptions: {},
    quantity: 1,
    photoStatus: 'ready',
  };

  // artwork + mask + the sample face; the face is also registered under its photo id,
  // which is how the renderer looks it up
  const keys = new Set<string>();
  for (const layer of schema.characterLayers) for (const v of layer.variants) keys.add(v.assetKey);
  keys.add(schema.faceZone.maskAssetKey);
  keys.add(SAMPLE_FACE_KEY);
  const assetBytes = await loadLocalAssets(keys, ASSET_ROOT);
  assetBytes.set(SAMPLE_PHOTO_ID, assetBytes.get(SAMPLE_FACE_KEY)!);

  const pkg = await buildProductionPackage({ schema, design, assetBytes });

  const storage = createLocalStorage(OUT_DIR);
  const prefix = `${PRODUCT_ID}/v${schema.version}`;
  const stored = await Promise.all([
    storage.put(`${prefix}/print.png`, pkg.printPng, 'image/png'),
    storage.put(`${prefix}/cut.svg`, pkg.cutSvg, 'image/svg+xml'),
    storage.put(`${prefix}/preview.png`, pkg.previewPng, 'image/png'),
    storage.put(`${prefix}/spec.json`, pkg.specJson, 'application/json'),
  ]);

  console.log(`schema v${schema.version} from ${BASE}`);
  console.log(
    `print: ${pkg.meta.widthPx}x${pkg.meta.heightPx}px @ ${pkg.meta.dpi} DPI, withdrawal: ${pkg.meta.withdrawalRight}`,
  );
  for (const o of stored) console.log(`  ${o.key} — ${(o.bytes / 1024).toFixed(1)} KB -> ${o.locator}`);
}

main().catch((err) => {
  console.error(`render-sample failed: ${(err as Error).message}`);
  process.exit(1);
});

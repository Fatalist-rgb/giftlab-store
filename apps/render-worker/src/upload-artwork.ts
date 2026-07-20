import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createR2Client, createR2Storage, r2ConfigFromEnv } from './storage/r2.js';

/**
 * Upload the character artwork set to R2 (the "artwork lives in R2" half of T027).
 * Local files from GL_ASSET_ROOT/art/* land under art/* in the bucket — exactly the
 * keys the schema references ("/art/body-blue.png"), so the R2 asset resolver finds
 * them without any mapping. Idempotent (uploads overwrite). Run with:
 *   pnpm --filter render-worker r2:upload-artwork
 */
const ASSET_ROOT = process.env.GL_ASSET_ROOT ?? '../storefront/public';

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

async function main() {
  const cfg = r2ConfigFromEnv();
  if (!cfg) throw new Error('R2 is not configured — fill in apps/render-worker/.env');

  const storage = createR2Storage(cfg, createR2Client(cfg));
  const artDir = resolve(ASSET_ROOT, 'art');
  const files = (await readdir(artDir)).filter((f) => MIME[extname(f).toLowerCase()]);
  if (!files.length) throw new Error(`no artwork files in ${artDir}`);

  for (const file of files) {
    const bytes = await readFile(join(artDir, file));
    const stored = await storage.put(`art/${file}`, new Uint8Array(bytes), MIME[extname(file).toLowerCase()]);
    console.log(`  art/${file} — ${(stored.bytes / 1024).toFixed(1)} KB`);
  }
  console.log(`uploaded ${files.length} artwork files to "${cfg.bucket}"`);
}

main().catch((err) => {
  console.error(`upload-artwork failed — ${(err as Error).message}`);
  process.exit(1);
});

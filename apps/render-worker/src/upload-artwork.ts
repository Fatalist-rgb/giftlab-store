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

  // recursive: the poses live in art/poses/, and their schema keys carry that folder —
  // a flat listing would silently skip them and the worker would render bodyless figures
  const walk = async (dir: string, prefix = ''): Promise<string[]> => {
    const out: string[] = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) out.push(...(await walk(join(dir, e.name), rel)));
      else if (MIME[extname(e.name).toLowerCase()]) out.push(rel);
    }
    return out;
  };

  const files = await walk(artDir);
  if (!files.length) throw new Error(`no artwork files in ${artDir}`);

  for (const file of files) {
    const bytes = await readFile(join(artDir, file));
    const mime = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
    const stored = await storage.put(`art/${file}`, new Uint8Array(bytes), mime);
    console.log(`  art/${file} — ${(stored.bytes / 1024).toFixed(1)} KB`);
  }
  console.log(`uploaded ${files.length} artwork files to "${cfg.bucket}"`);
}

main().catch((err) => {
  console.error(`upload-artwork failed — ${(err as Error).message}`);
  process.exit(1);
});

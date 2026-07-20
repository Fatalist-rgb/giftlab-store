import { loadLocalAssets } from './assets/local.js';
import { createR2AssetResolver } from './assets/r2.js';
import { createLocalStorage } from './storage/local.js';
import { createR2Client, createR2Storage, r2ConfigFromEnv } from './storage/r2.js';
import type { PackageStorage } from './storage/types.js';
import { startRenderWorker, type AssetResolver } from './worker.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const assetRoot = process.env.GL_ASSET_ROOT ?? '../storefront/public';
const outDir = process.env.GL_OUT_DIR ?? './out';

// Cloudflare R2 when configured, local disk otherwise. The worker sees only the ports,
// so switching storage never touches the rendering code.
const r2 = r2ConfigFromEnv();
let resolveAssets: AssetResolver;
let storage: PackageStorage;

if (r2) {
  const client = createR2Client(r2);
  resolveAssets = createR2AssetResolver(client, r2.bucket);
  storage = createR2Storage(r2, client);
  console.log(`[render-worker] storage: R2 bucket "${r2.bucket}"`);
} else {
  resolveAssets = (keys) => loadLocalAssets(keys, assetRoot);
  storage = createLocalStorage(outDir);
  console.log(`[render-worker] storage: local disk (${outDir}) — set R2_* to use Cloudflare R2`);
}

// completion hook: reports finished packages back to Medusa (flips lines to "ready")
const hookUrl = process.env.RENDER_HOOK_URL;
const hookToken = process.env.RENDER_HOOK_TOKEN;
const completionHook = hookUrl && hookToken ? { url: hookUrl, token: hookToken } : undefined;
if (!completionHook) console.log('[render-worker] no RENDER_HOOK_URL/TOKEN — packages will not be reported back');

const worker = startRenderWorker({ redisUrl, resolveAssets, storage, completionHook });

worker.on('ready', () => console.log('[render-worker] listening on gl-render'));
worker.on('failed', (job, err) => console.error('[render-worker] job failed', job?.id, err));

const shutdown = async () => {
  await worker.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

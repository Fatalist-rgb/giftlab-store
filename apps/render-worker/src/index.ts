import { loadLocalAssets } from './assets/local.js';
import { createLocalStorage } from './storage/local.js';
import { startRenderWorker } from './worker.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

// Development adapters back onto local disk. In production these are swapped for the
// Cloudflare R2 adapters (same ports) once the client's bucket exists.
const assetRoot = process.env.GL_ASSET_ROOT ?? '../storefront/public';
const outDir = process.env.GL_OUT_DIR ?? './out';

const worker = startRenderWorker({
  redisUrl,
  resolveAssets: (keys) => loadLocalAssets(keys, assetRoot),
  storage: createLocalStorage(outDir),
});

worker.on('ready', () => console.log('[render-worker] listening on gl:render'));
worker.on('failed', (job, err) => console.error('[render-worker] job failed', job?.id, err));

const shutdown = async () => {
  await worker.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

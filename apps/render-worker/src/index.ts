import { startRenderWorker } from './worker.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const worker = startRenderWorker(redisUrl);

worker.on('ready', () => console.log('[render-worker] listening on gl:render'));
worker.on('failed', (job, err) => console.error('[render-worker] job failed', job?.id, err));

const shutdown = async () => {
  await worker.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

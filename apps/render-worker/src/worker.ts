import type { DesignState, ProductSchema } from '@gl/constructor';
import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { buildProductionPackage } from './package/build.js';
import type { PackageStorage } from './storage/types.js';

export interface RenderJobData {
  orderLineId: string;
  schema: ProductSchema;
  design: DesignState;
  /** asset keys the renderer needs: artwork, face mask, and the customer's cutout */
  assetKeys: string[];
}

/** Resolves asset keys to bytes — local disk in development, R2 in production. */
export type AssetResolver = (keys: string[]) => Promise<Map<string, Uint8Array>>;

export interface RenderWorkerOptions {
  redisUrl: string;
  resolveAssets: AssetResolver;
  storage: PackageStorage;
}

/**
 * BullMQ consumer of the `gl:render` queue. Assets and storage are injected as ports, so
 * the same worker runs against local disk in development and Cloudflare R2 in production —
 * only the adapters change, never this code.
 */
export function startRenderWorker(opts: RenderWorkerOptions): Worker<RenderJobData> {
  const connection = new IORedis(opts.redisUrl, { maxRetriesPerRequest: null });

  return new Worker<RenderJobData>(
    'gl:render',
    async (job: Job<RenderJobData>) => {
      const assetBytes = await opts.resolveAssets(job.data.assetKeys);

      const pkg = await buildProductionPackage({
        schema: job.data.schema,
        design: job.data.design,
        assetBytes,
      });

      const prefix = `orders/${job.data.orderLineId}`;
      const stored = await Promise.all([
        opts.storage.put(`${prefix}/print.png`, pkg.printPng, 'image/png'),
        opts.storage.put(`${prefix}/cut.svg`, pkg.cutSvg, 'image/svg+xml'),
        opts.storage.put(`${prefix}/preview.png`, pkg.previewPng, 'image/png'),
        opts.storage.put(`${prefix}/spec.json`, pkg.specJson, 'application/json'),
      ]);

      // TODO(medusa): persist a ProductionPackage row against the order line with these keys
      return {
        orderLineId: job.data.orderLineId,
        stored: stored.map((o) => ({ key: o.key, bytes: o.bytes })),
        withdrawalRight: pkg.meta.withdrawalRight,
      };
    },
    { connection },
  );
}

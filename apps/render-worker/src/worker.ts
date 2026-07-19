import type { DesignState, ProductSchema } from '@gl/constructor';
import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { buildProductionPackage } from './package/build.js';

export interface RenderJobData {
  orderLineId: string;
  schema: ProductSchema;
  design: DesignState;
  /** in production these are R2 keys, resolved to bytes before rendering */
  assetKeys: string[];
}

/**
 * BullMQ consumer of the `gl:render` queue. The rendering core (buildProductionPackage) is
 * fully wired; the two seams still blocked on the client's Cloudflare credentials are
 * fetching artwork/cutout bytes from R2 and storing the finished package back to R2.
 */
export function startRenderWorker(redisUrl: string): Worker<RenderJobData> {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  return new Worker<RenderJobData>(
    'gl:render',
    async (job: Job<RenderJobData>) => {
      // TODO(client-R2): resolve job.data.assetKeys -> bytes from Cloudflare R2
      const assetBytes = new Map<string, Uint8Array>();

      const pkg = await buildProductionPackage({
        schema: job.data.schema,
        design: job.data.design,
        assetBytes,
      });

      // TODO(client-R2): upload pkg.printPng / cutSvg / previewPng / specJson to R2 and
      // persist a ProductionPackage row against the order line.
      return {
        orderLineId: job.data.orderLineId,
        printBytes: pkg.printPng.length,
        withdrawalRight: pkg.meta.withdrawalRight,
      };
    },
    { connection },
  );
}

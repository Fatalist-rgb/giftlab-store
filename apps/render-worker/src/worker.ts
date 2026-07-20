import { parseDesignState, parseProductSchema } from '@gl/constructor';
import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { buildProductionPackage } from './package/build.js';
import type { PackageStorage } from './storage/types.js';

export interface RenderJobData {
  lineItemId: string;
  /** raw schema/design documents from the backend — re-validated here before rendering */
  schema: unknown;
  design: unknown;
  /** asset keys the renderer needs: artwork, face mask, and the customer's cutout */
  assetKeys: string[];
}

/** Resolves asset keys to bytes — local disk in development, R2 in production. */
export type AssetResolver = (keys: string[]) => Promise<Map<string, Uint8Array>>;

/** Reports a finished package back to the Medusa backend (token-guarded hook). */
export interface CompletionHook {
  url: string;
  token: string;
}

export interface RenderWorkerOptions {
  redisUrl: string;
  resolveAssets: AssetResolver;
  storage: PackageStorage;
  completionHook?: CompletionHook;
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
      // the payload crossed a queue — re-validate with the engine before rendering
      const schema = parseProductSchema(job.data.schema);
      const design = parseDesignState(job.data.design, schema);

      const assetBytes = await opts.resolveAssets(job.data.assetKeys);

      const pkg = await buildProductionPackage({ schema, design, assetBytes });

      const prefix = `orders/${job.data.lineItemId}`;
      const stored = await Promise.all([
        opts.storage.put(`${prefix}/print.png`, pkg.printPng, 'image/png'),
        opts.storage.put(`${prefix}/cut.svg`, pkg.cutSvg, 'image/svg+xml'),
        opts.storage.put(`${prefix}/preview.png`, pkg.previewPng, 'image/png'),
        opts.storage.put(`${prefix}/spec.json`, pkg.specJson, 'application/json'),
      ]);

      // report back so the backend records the ProductionPackage and flips the line to ready
      if (opts.completionHook) {
        const res = await fetch(opts.completionHook.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-gl-render-token': opts.completionHook.token,
          },
          body: JSON.stringify({
            lineItemId: job.data.lineItemId,
            keys: {
              printPng: `${prefix}/print.png`,
              cutSvg: `${prefix}/cut.svg`,
              previewPng: `${prefix}/preview.png`,
              specJson: `${prefix}/spec.json`,
            },
            meta: pkg.meta,
            engineVersion: 'gl-constructor@0',
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`completion hook failed: HTTP ${res.status}`);
      }

      return {
        lineItemId: job.data.lineItemId,
        stored: stored.map((o) => ({ key: o.key, bytes: o.bytes })),
        withdrawalRight: pkg.meta.withdrawalRight,
      };
    },
    { connection },
  );
}

import { Queue } from 'bullmq'

/**
 * BullMQ producers for the render pipeline (T023). Guarded by REDIS_URL: local dev runs
 * Medusa on its in-memory fake redis, so when no real Redis is configured the enqueue is
 * skipped with a log line instead of hanging — orders still freeze their designs and the
 * job can be re-queued later from the admin.
 */
export const RENDER_QUEUE = 'gl-render'

let queue: Queue | null = null

export function renderQueueOrNull(): Queue | null {
  const url = process.env.REDIS_URL
  if (!url) return null
  if (!queue) {
    queue = new Queue(RENDER_QUEUE, {
      connection: { url },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: false,
      },
    })
  }
  return queue
}

/** The payload the render worker consumes — self-contained, so the worker needs no DB. */
export interface RenderJobPayload {
  orderId: string
  orderDisplayId: number | null
  lineItemId: string
  designStateId: string
  /** the published ProductSchema document, exactly as frozen for this order */
  schema: Record<string, unknown>
  /** the engine DesignState (camelCase), face photo id rewritten to its R2 cutout key */
  design: Record<string, unknown>
  /** every R2 key the renderer must resolve (artwork, mask, face cutout) */
  assetKeys: string[]
}

export async function enqueueRender(payload: RenderJobPayload): Promise<boolean> {
  const q = renderQueueOrNull()
  if (!q) return false
  // idempotent per line; BullMQ forbids ':' in custom job ids
  await q.add('render', payload, { jobId: `render-${payload.lineItemId}` })
  return true
}

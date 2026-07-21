import type { MedusaContainer } from '@medusajs/framework'
import { PERSONALIZATION_MODULE } from '../modules/personalization'
import type PersonalizationModuleService from '../modules/personalization/service'
import { r2Client, r2Configured } from '../lib/r2'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

/**
 * RODO retention (FR-034 / T067): photos whose `expires_at` has passed are deleted —
 * the R2 objects (original, cutout, preview) removed and the row flipped to `deleted`
 * with its keys cleared. Runs daily; each run is idempotent and processes a bounded
 * batch so a backlog can never wedge the schedule.
 */
export default async function photoRetentionJob(container: MedusaContainer) {
  const logger = container.resolve('logger')
  if (!r2Configured()) {
    logger.info('[gl] photo-retention: R2 not configured — skipped')
    return
  }

  const personalization: PersonalizationModuleService = container.resolve(PERSONALIZATION_MODULE)
  const now = new Date()
  const expired = await personalization.listPhotos(
    { status: 'active', expires_at: { $lt: now } },
    { take: 200 },
  )
  if (!expired.length) {
    logger.info('[gl] photo-retention: nothing expired')
    return
  }

  const { client, env } = r2Client()
  let deleted = 0
  for (const photo of expired) {
    const keys = [photo.original_key, photo.cutout_key, photo.preview_key].filter(
      (k): k is string => Boolean(k && k !== 'pending'),
    )
    try {
      for (const key of keys) {
        await client.send(new DeleteObjectCommand({ Bucket: env.bucket, Key: key.replace(/^\//, '') }))
      }
      await personalization.updatePhoto({
        id: photo.id,
        status: 'deleted',
        original_key: 'deleted',
        cutout_key: null,
        preview_key: null,
        checksum: null,
      })
      deleted += 1
    } catch (e) {
      logger.warn(`[gl] photo-retention: ${photo.id} failed — ${(e as Error).message}`)
    }
  }
  logger.info(`[gl] photo-retention: deleted ${deleted}/${expired.length} expired photos`)

  // orphans: signed but never finalized (no expires_at) — nothing was uploaded or the
  // customer abandoned the flow; after 7 days the row (and any stray objects) go
  const orphanCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const orphans = await personalization.listPhotos(
    { status: 'active', expires_at: null, created_at: { $lt: orphanCutoff } },
    { take: 200 },
  )
  let cleaned = 0
  for (const photo of orphans) {
    const keys = [photo.original_key, photo.cutout_key, photo.preview_key].filter(
      (k): k is string => Boolean(k && k !== 'pending'),
    )
    try {
      for (const key of keys) {
        await client.send(new DeleteObjectCommand({ Bucket: env.bucket, Key: key.replace(/^\//, '') }))
      }
      await personalization.updatePhoto({
        id: photo.id,
        status: 'deleted',
        original_key: 'deleted',
        cutout_key: null,
        preview_key: null,
      })
      cleaned += 1
    } catch (e) {
      logger.warn(`[gl] photo-retention: orphan ${photo.id} failed — ${(e as Error).message}`)
    }
  }
  if (orphans.length) logger.info(`[gl] photo-retention: cleaned ${cleaned}/${orphans.length} orphan uploads`)
}

export const config = {
  name: 'gl-photo-retention',
  schedule: '0 3 * * *', // daily, 03:00
}

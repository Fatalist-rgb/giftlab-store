import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PERSONALIZATION_MODULE } from '../../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../../modules/personalization/service'
import { presignPut, r2Configured } from '../../../../../lib/r2'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

/**
 * POST /store/gl/uploads/sign — start a photo upload (T033, step 1). Creates the
 * uploaded_photo record and returns presigned PUT URLs the browser uploads to directly:
 * the original photo and (optionally) the browser-produced background cutout. Photo
 * bytes never pass through the backend; the bucket is EU-jurisdiction (RODO).
 * Body: { mime, withCutout?: boolean }.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!r2Configured()) {
    return res.status(503).json({ message: 'photo storage is not configured' })
  }
  const body = (req.body ?? {}) as { mime?: string; withCutout?: boolean }
  const mime = (body.mime ?? '').toLowerCase()
  if (!ALLOWED_MIME.has(mime)) {
    return res.status(400).json({ message: `unsupported mime: ${mime || '(empty)'}` })
  }

  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)
  const photo = await personalization.createPhoto({
    original_key: 'pending', // set for real below, once the id exists
    mime,
    cutout_status: 'pending',
    status: 'active',
  })

  const originalKey = `photos/${photo.id}/original`
  const cutoutKey = `photos/${photo.id}/cutout.png`
  await personalization.updatePhoto({
    id: photo.id,
    original_key: originalKey,
    cutout_key: body.withCutout ? cutoutKey : null,
  })

  const [originalPutUrl, cutoutPutUrl] = await Promise.all([
    presignPut(originalKey, mime),
    body.withCutout ? presignPut(cutoutKey, 'image/png') : Promise.resolve(null),
  ])

  res.status(201).json({ uploadId: photo.id, originalPutUrl, cutoutPutUrl })
}

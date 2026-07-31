import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { PERSONALIZATION_MODULE } from '../../../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../../../modules/personalization/service'
import { CONSENT_MODULE } from '../../../../../../modules/consent'
import type ConsentModuleService from '../../../../../../modules/consent/service'
import { getObjectBytes, headObject, putObject } from '../../../../../../lib/r2'
import { clientIp, rateLimit } from '../../../../../../lib/rate-limit'

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB cap for a phone photo
const MAX_EDGE_PX = 4000 // plenty for a 300 DPI face zone; caps storage and render cost
const RETENTION_DAYS = 60 // FR-034 — tightened to "fulfilment + 60" once fulfilment lands

const isHeic = (bytes: Uint8Array) => {
  // ISO-BMFF: [4-byte size]"ftyp" + brand containing hei*/mif1/msf1
  if (bytes.length < 16) return false
  const ascii = Buffer.from(bytes.subarray(4, 16)).toString('ascii')
  return ascii.startsWith('ftyp') && /hei|mif1|msf1/i.test(ascii)
}

/**
 * POST /store/gl/uploads/:id/finalize — the photo is in R2; normalize the master
 * (T033, step 2): HEIC→JPEG, EXIF orientation applied, metadata stripped (privacy),
 * long edge capped. Records the RODO processing consent (FR-032) and the retention
 * deadline (FR-034). Never blocks on low resolution — that is a warning at design time.
 * Body: { consent: true, subjectRef? }.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  // sharp normalization is CPU-heavy — same budget as signing
  if (!rateLimit(`finalize:${clientIp(req)}`, 30, 60 * 60 * 1000)) {
    return res.status(429).json({ message: 'too many requests, try later' })
  }
  const { id } = req.params
  const body = (req.body ?? {}) as { consent?: boolean; subjectRef?: string; cutoutSkipped?: boolean }
  if (body.consent !== true) {
    return res.status(400).json({ message: 'photo processing consent is required (FR-032)' })
  }

  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)
  let photo
  try {
    photo = await personalization.retrieveUploadedPhoto(id)
  } catch {
    return res.status(404).json({ message: `upload not found: ${id}` })
  }

  const head = await headObject(photo.original_key)
  if (!head) {
    return res.status(409).json({ message: 'original not uploaded yet' })
  }
  if ((head.ContentLength ?? 0) > MAX_BYTES) {
    return res.status(413).json({ message: 'photo exceeds the 25 MB limit' })
  }

  // normalize the master: HEIC -> JPEG, apply EXIF rotation, strip metadata, cap size
  let bytes = await getObjectBytes(photo.original_key)
  let working: Buffer = Buffer.from(bytes)
  if (isHeic(bytes)) {
    const { default: heicConvert } = await import('heic-convert')
    working = Buffer.from(await heicConvert({ buffer: working, format: 'JPEG', quality: 0.92 }))
  }
  const normalized = await sharp(working)
    .rotate() // bake EXIF orientation in
    .resize({ width: MAX_EDGE_PX, height: MAX_EDGE_PX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 92 }) // re-encode drops EXIF/GPS metadata
    .toBuffer({ resolveWithObject: true })

  await putObject(photo.original_key, new Uint8Array(normalized.data), 'image/jpeg')

  // browser-produced cutout (background removed on the customer's device — RODO-friendly)
  let cutoutReady = false
  if (photo.cutout_key) {
    cutoutReady = (await headObject(photo.cutout_key)) !== null
  }
  // "skipped": the browser could not cut the background out (old device / no WASM) and
  // the customer chose to continue with the plain photo. Ordering must not dead-end on
  // a failed cutout — the face zone is masked anyway and the operator gets a warning.
  const cutoutStatus = cutoutReady ? 'ready' : body.cutoutSkipped === true ? 'skipped' : 'pending'

  // RODO: record the processing consent and the retention deadline
  const consent: ConsentModuleService = req.scope.resolve(CONSENT_MODULE)
  const consentRow = await consent.recordConsent({
    type: 'photo_processing',
    subject_ref: body.subjectRef || `upload:${id}`,
    user_agent: req.headers['user-agent'] as string | undefined,
  })

  const expires = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000)
  await personalization.updatePhoto({
    id,
    mime: 'image/jpeg',
    width_px: normalized.info.width,
    height_px: normalized.info.height,
    cutout_status: cutoutStatus,
    checksum: createHash('sha256').update(normalized.data).digest('hex'),
    consent_id: consentRow.id,
    expires_at: expires,
  })

  res.json({
    uploadId: id,
    widthPx: normalized.info.width,
    heightPx: normalized.info.height,
    cutoutStatus,
    // low resolution warns, never blocks (FR-004)
    qualityWarning: normalized.info.width < 900 || normalized.info.height < 900,
    expiresAt: expires.toISOString(),
  })
}

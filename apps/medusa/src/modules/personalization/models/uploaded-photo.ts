import { model } from '@medusajs/framework/utils'

/**
 * A customer's uploaded face photo and its derived assets. Only R2 keys and
 * metadata live in the DB; the image bytes live in R2 (private). Retention is
 * enforced via `expires_at` (60 days after fulfilment, FR-034).
 */
const UploadedPhoto = model.define('uploaded_photo', {
  id: model.id().primaryKey(),
  original_key: model.text(), // private R2 key (normalized master: HEIC->raster, EXIF applied, stripped)
  cutout_key: model.text().nullable(), // background-removed derivative
  preview_key: model.text().nullable(), // downscaled web preview
  mime: model.text().nullable(),
  width_px: model.number().nullable(),
  height_px: model.number().nullable(),
  // "skipped": the browser could not remove the background and the customer chose to
  // continue with the plain photo — printable (the face zone is masked), but flagged
  cutout_status: model.enum(['pending', 'ready', 'failed', 'skipped']).default('pending'),
  checksum: model.text().nullable(), // dedupe / integrity
  consent_id: model.text().nullable(), // -> ConsentRecord (photo processing, FR-032)
  expires_at: model.dateTime().nullable(),
  status: model.enum(['active', 'deleted']).default('active'),
})

export default UploadedPhoto

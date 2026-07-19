import { model } from '@medusajs/framework/utils'

/**
 * A GDPR consent event (FR-032 photo processing, FR-035 cookies). Minimized audit:
 * a hashed IP and the user agent, the subject reference (session / customer / order),
 * and — for cookie consent — which categories were granted. The seller must be able
 * to prove consent was given, so records are append-only.
 */
const ConsentRecord = model.define('consent_record', {
  id: model.id().primaryKey(),
  type: model.enum(['photo_processing', 'cookies']),
  categories: model.json().nullable(), // e.g. ['analytics','marketing'] for cookies
  subject_ref: model.text().index(), // session / customer / order ref
  granted_at: model.dateTime(),
  ip_hash: model.text().nullable(),
  user_agent: model.text().nullable(),
})

export default ConsentRecord

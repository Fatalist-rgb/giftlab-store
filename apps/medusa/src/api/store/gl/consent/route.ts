import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { CONSENT_MODULE } from '../../../../modules/consent'
import type ConsentModuleService from '../../../../modules/consent/service'

const ALLOWED = new Set(['analytics', 'marketing'])

/**
 * POST /store/gl/consent — record a cookie-consent choice (FR-035). Append-only:
 * every change of mind lands as a new record, so the grant history is provable.
 * Body: { subjectRef, categories: string[] }.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as { subjectRef?: string; categories?: string[] }
  if (!body.subjectRef || typeof body.subjectRef !== 'string' || body.subjectRef.length > 128) {
    return res.status(400).json({ message: 'subjectRef is required' })
  }
  const categories = (body.categories ?? []).filter((c) => ALLOWED.has(c))

  const consent: ConsentModuleService = req.scope.resolve(CONSENT_MODULE)
  const rec = await consent.recordConsent({
    type: 'cookies',
    subject_ref: body.subjectRef,
    categories,
    user_agent: (req.headers['user-agent'] as string | undefined)?.slice(0, 255),
  })

  res.status(201).json({ ok: true, id: rec.id, categories })
}

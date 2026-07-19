import { MedusaService } from '@medusajs/framework/utils'
import ConsentRecord from './models/consent-record'

export type ConsentType = 'photo_processing' | 'cookies'

/**
 * Records and answers GDPR consent (photo processing, cookies). Consent is append-only
 * so the grant history is reconstructable; the latest record is authoritative.
 */
class ConsentModuleService extends MedusaService({ ConsentRecord }) {
  /** Record a consent event. `granted_at` defaults to now. */
  async recordConsent(input: {
    type: ConsentType
    subject_ref: string
    categories?: string[]
    granted_at?: Date
    ip_hash?: string
    user_agent?: string
  }) {
    const [rec] = await this.createConsentRecords([
      {
        type: input.type,
        subject_ref: input.subject_ref,
        // model.json() types as Record<string, unknown>; cookies store an array of categories
        categories: (input.categories ?? null) as unknown as Record<string, unknown>,
        granted_at: input.granted_at ?? new Date(),
        ip_hash: input.ip_hash ?? null,
        user_agent: input.user_agent ?? null,
      },
    ])
    return rec
  }

  /** The most recent consent of a type for a subject, or null. */
  async latestConsent(subjectRef: string, type: ConsentType) {
    const [rec] = await this.listConsentRecords(
      { subject_ref: subjectRef, type },
      { order: { granted_at: 'DESC' }, take: 1 },
    )
    return rec ?? null
  }

  /** Whether the subject currently has consent of a type (optionally for a cookie category). */
  async hasConsent(subjectRef: string, type: ConsentType, category?: string): Promise<boolean> {
    const latest = await this.latestConsent(subjectRef, type)
    if (!latest) return false
    if (!category) return true
    const cats = (latest.categories as string[] | null) ?? []
    return cats.includes(category)
  }
}

export default ConsentModuleService

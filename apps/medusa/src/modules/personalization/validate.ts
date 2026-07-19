/**
 * Per-line legal logic for the personalization domain. Mirrors
 * @gl/constructor.computeWithdrawalRight so the storefront preview and the order
 * record agree. Pure and side-effect free so it can be unit-tested and reused.
 */

export type WithdrawalRight = 'excluded' | 'applies'

type PersonalizationInput = {
  face_layer?: { uploaded_photo_id?: string | null } | null
  text_values?: Array<{ value?: string | null }> | null
}

/** A line is personalized if it carries a face photo and/or any non-empty text value. */
export function isPersonalized(input: PersonalizationInput): boolean {
  const hasFace = !!input.face_layer?.uploaded_photo_id
  const hasText = (input.text_values ?? []).some((t) => (t?.value ?? '').trim().length > 0)
  return hasFace || hasText
}

/**
 * Statutory right of withdrawal per line (FR-029, art. 38 pkt 3 UPK): a personalized
 * item (face photo and/or name) is EXCLUDED from the 14-day right; an item built only
 * from standard options keeps it. Computed per line and frozen at purchase — a blanket
 * exclusion would be both wrong and an unfair-term risk.
 */
export function withdrawalRightFor(input: PersonalizationInput): WithdrawalRight {
  return isPersonalized(input) ? 'excluded' : 'applies'
}

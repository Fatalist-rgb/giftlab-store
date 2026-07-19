import { computeWithdrawalRight, type WithdrawalVerdict } from '../../lib/gl-constructor'

/**
 * Per-line legal logic, delegated to the shared @gl/constructor engine so the storefront
 * preview and the order record agree exactly. In particular a DEFERRED-photo line counts
 * as personalized (excluded) — the customer has committed to a made-to-order item. This
 * maps the stored (snake_case) design to the engine's DesignState shape.
 */

type StoredDesign = {
  face_layer?: unknown | null
  photo_status?: string | null
  text_values?: Array<{ value?: string | null }> | null
}

function toEngineDesign(d: StoredDesign) {
  return {
    faceLayer: d.face_layer ?? null,
    photoStatus: (d.photo_status ?? 'ready') as 'ready' | 'deferred' | 'processing' | 'failed',
    textValues: (d.text_values ?? []).map((t) => ({ fieldId: '', value: t?.value ?? '' })),
    // fields the engine's DesignState type requires but computeWithdrawalRight does not read
    quantity: 1,
    characterSelections: {},
    selectedOptions: {},
  }
}

/** The per-line withdrawal right (FR-029), computed by the engine. */
export function withdrawalRightFor(d: StoredDesign): WithdrawalVerdict {
  return computeWithdrawalRight(toEngineDesign(d))
}

/** A line is personalized iff it is excluded from the withdrawal right. */
export function isPersonalized(d: StoredDesign): boolean {
  return withdrawalRightFor(d) === 'excluded'
}

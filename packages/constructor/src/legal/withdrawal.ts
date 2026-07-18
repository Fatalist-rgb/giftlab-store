import type { DesignState } from '../design-state/types.js';

export type WithdrawalVerdict = 'excluded' | 'applies';

/**
 * The 14-day withdrawal right, computed per order line (FR-029, Constitution VIII).
 * The statutory exclusion (art. 38 pkt 3 UPK) attaches to *personalization*, not to the
 * product line: a figurine carrying a face photo and/or a name is made-to-order and
 * excluded; a line configured only from standard options keeps the ordinary right.
 *
 * Pure and deterministic — the legal position of every line is reproducible from data.
 */
export function computeWithdrawalRight(design: DesignState): WithdrawalVerdict {
  const hasFace = design.faceLayer !== null || design.photoStatus === 'deferred';
  const hasText = design.textValues.some((t) => t.value.trim().length > 0);
  return hasFace || hasText ? 'excluded' : 'applies';
}

/**
 * @gl/constructor logic surface — schema, validation, pricing, legal, quality and
 * contour, WITHOUT any rendering (no canvas / no DOM). This is the entry that gets
 * bundled (with zod) and vendored into the Medusa backend, so the server validates
 * schemas and computes prices with the exact same code as the storefront preview.
 *
 * Keep this render-free: nothing here may import ./render/*.
 */

// schema + validation
export * from './schema/types.js';
export {
  parseProductSchema,
  safeParseProductSchema,
  defaultSelectionPriceDelta,
} from './schema/validate.js';

// design state + validation
export * from './design-state/types.js';
export { parseDesignState, crossCheck } from './design-state/validate.js';

// pricing (the single price authority)
export {
  computePrice,
  unitPriceForQuantity,
  selectionDelta,
  type PriceBreakdown,
  type PriceLineItem,
} from './pricing/index.js';

// legal
export { computeWithdrawalRight, type WithdrawalVerdict } from './legal/withdrawal.js';

// quality
export { assessPhoto, type PhotoInput, type PhotoAssessment } from './quality/index.js';

// contour
export { buildCutContour, type CutPath } from './contour/index.js';

// errors
export { ConstructorError, FreeDefaultViolation, DesignStateInvalid } from './errors.js';

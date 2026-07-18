/**
 * @gl/constructor — the fidelity, pricing and legal keystone shared by the storefront and
 * the render worker. Everything here is pure and deterministic so the browser preview and
 * the 300 DPI production file are provably the same design.
 */

// schema + validation
export * from './schema/types.js';
export { parseProductSchema, safeParseProductSchema, defaultSelectionPriceDelta } from './schema/validate.js';

// design state + validation
export * from './design-state/types.js';
export { parseDesignState, crossCheck } from './design-state/validate.js';

// scene
export * from './render/types.js';
export { buildScene } from './render/scene.js';

// pricing
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

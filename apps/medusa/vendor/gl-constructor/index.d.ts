/**
 * Pragmatic type surface for the vendored, bundled @gl/constructor logic (index.cjs).
 * The authoritative types live in packages/constructor; these cover the backend's use.
 * Regenerate the bundle with `pnpm --filter @gl/constructor build:medusa`.
 */

export interface LocalizedText {
  pl: string
  en?: string
  uk?: string
}

export interface ProductSchema {
  id: string
  medusaProductId: string
  version: number
  status: 'draft' | 'published' | 'archived'
  canvasPx: { w: number; h: number }
  characterLayers: Array<{
    id: string
    zIndex: number
    variants: Array<{ id: string; priceDelta: number; [k: string]: unknown }>
    [k: string]: unknown
  }>
  options: Array<{
    id: string
    default?: string
    values: Array<{ id: string; priceDelta: number; [k: string]: unknown }>
    [k: string]: unknown
  }>
  pricingRules: {
    base: number
    currency: string
    quantityLadder: Array<{ minQty: number; unitPrice: number }>
  }
  [k: string]: unknown
}

export interface DesignState {
  quantity: number
  characterSelections: Record<string, string>
  selectedOptions: Record<string, string>
  faceLayer: unknown | null
  photoStatus: 'ready' | 'deferred' | 'processing' | 'failed'
  textValues: Array<{ fieldId: string; value: string; [k: string]: unknown }>
  [k: string]: unknown
}

export interface PriceLineItem {
  designIndex: number
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface PriceBreakdown {
  currency: string
  quantity: number
  ladderUnitPrice: number
  ladderTierMinQty: number
  items: PriceLineItem[]
  total: number
}

export type WithdrawalVerdict = 'excluded' | 'applies'

export function parseProductSchema(input: unknown): ProductSchema
export function safeParseProductSchema(
  input: unknown,
): { ok: true; schema: ProductSchema } | { ok: false; errors: string[] }
export function defaultSelectionPriceDelta(schema: ProductSchema): number
export function parseDesignState(input: unknown, schema: ProductSchema): DesignState
export function crossCheck(design: DesignState, schema: ProductSchema): string[]
export function computePrice(schema: ProductSchema, designs: DesignState[]): PriceBreakdown
export function unitPriceForQuantity(
  rules: ProductSchema['pricingRules'],
  qty: number,
): { unitPrice: number; tierMinQty: number }
export function selectionDelta(schema: ProductSchema, design: DesignState): number
export function computeWithdrawalRight(design: DesignState): WithdrawalVerdict

export class ConstructorError extends Error {}
export class FreeDefaultViolation extends ConstructorError {
  readonly delta: number
}
export class DesignStateInvalid extends ConstructorError {}

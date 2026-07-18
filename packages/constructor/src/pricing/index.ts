import type { DesignState } from '../design-state/types.js';
import type { PricingRules, ProductSchema } from '../schema/types.js';

export interface PriceLineItem {
  designIndex: number;
  quantity: number;
  /** minor units (grosz) per unit, incl. any option/variant deltas */
  unitPrice: number;
  lineTotal: number;
}

export interface PriceBreakdown {
  currency: string;
  /** total units across all designs — the quantity ladder keys off this */
  quantity: number;
  /** ladder unit price for the total quantity, before per-line deltas */
  ladderUnitPrice: number;
  ladderTierMinQty: number;
  items: PriceLineItem[];
  total: number;
}

/**
 * The ladder is a list of absolute unit prices keyed by a minimum quantity. The price
 * for `qty` is the highest tier whose `minQty <= qty`. (1 → base tier, 3 → mid, 6 → bulk.)
 */
export function unitPriceForQuantity(
  rules: PricingRules,
  qty: number,
): { unitPrice: number; tierMinQty: number } {
  const sorted = [...rules.quantityLadder].sort((a, b) => a.minQty - b.minQty);
  let chosen = sorted[0] ?? { minQty: 1, unitPrice: rules.base };
  for (const tier of sorted) {
    if (qty >= tier.minQty) chosen = tier;
  }
  return { unitPrice: chosen.unitPrice, tierMinQty: chosen.minQty };
}

/** Sum of the price deltas of the variants and options a design has selected. */
export function selectionDelta(schema: ProductSchema, design: DesignState): number {
  let delta = 0;
  for (const [layerId, variantId] of Object.entries(design.characterSelections)) {
    const layer = schema.characterLayers.find((l) => l.id === layerId);
    const variant = layer?.variants.find((v) => v.id === variantId);
    if (variant) delta += variant.priceDelta;
  }
  for (const [optionId, valueId] of Object.entries(design.selectedOptions)) {
    const option = schema.options.find((o) => o.id === optionId);
    const value = option?.values.find((v) => v.id === valueId);
    if (value) delta += value.priceDelta;
  }
  return delta;
}

/**
 * The single pricing authority (Constitution VIII). Returns minor units. The quantity
 * ladder applies across the whole order; per-line deltas (zero for this product) add on
 * top. The storefront displays this; the server recomputes it and never trusts the client.
 */
export function computePrice(schema: ProductSchema, designs: DesignState[]): PriceBreakdown {
  const quantity = designs.reduce((sum, d) => sum + d.quantity, 0);
  const { unitPrice: ladderUnitPrice, tierMinQty } = unitPriceForQuantity(
    schema.pricingRules,
    quantity,
  );

  const items: PriceLineItem[] = designs.map((design, designIndex) => {
    const unitPrice = ladderUnitPrice + selectionDelta(schema, design);
    return { designIndex, quantity: design.quantity, unitPrice, lineTotal: unitPrice * design.quantity };
  });

  return {
    currency: schema.pricingRules.currency,
    quantity,
    ladderUnitPrice,
    ladderTierMinQty: tierMinQty,
    items,
    total: items.reduce((sum, it) => sum + it.lineTotal, 0),
  };
}

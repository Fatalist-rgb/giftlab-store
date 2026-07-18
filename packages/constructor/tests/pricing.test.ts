import { describe, expect, it } from 'vitest';
import { computePrice, unitPriceForQuantity } from '../src/pricing/index.js';
import { parseProductSchema } from '../src/schema/validate.js';
import { makeDesign, rawSchema } from './fixtures.js';

const schema = parseProductSchema(rawSchema);

describe('unitPriceForQuantity — the ladder', () => {
  it('picks the tier for the quantity', () => {
    expect(unitPriceForQuantity(schema.pricingRules, 1).unitPrice).toBe(7900);
    expect(unitPriceForQuantity(schema.pricingRules, 2).unitPrice).toBe(7900);
    expect(unitPriceForQuantity(schema.pricingRules, 3).unitPrice).toBe(6500);
    expect(unitPriceForQuantity(schema.pricingRules, 5).unitPrice).toBe(6500);
    expect(unitPriceForQuantity(schema.pricingRules, 6).unitPrice).toBe(4900);
    expect(unitPriceForQuantity(schema.pricingRules, 12).unitPrice).toBe(4900);
  });
});

describe('computePrice', () => {
  it('prices a single figurine at the base tier', () => {
    const b = computePrice(schema, [makeDesign({ quantity: 1 })]);
    expect(b.quantity).toBe(1);
    expect(b.total).toBe(7900);
    expect(b.currency).toBe('PLN');
  });

  it('applies the bulk tier across the whole order (total quantity)', () => {
    // two lines, 3 units total -> the 3+ tier (6500) applies to both
    const b = computePrice(schema, [makeDesign({ quantity: 2 }), makeDesign({ quantity: 1 })]);
    expect(b.quantity).toBe(3);
    expect(b.ladderUnitPrice).toBe(6500);
    expect(b.total).toBe(6500 * 3);
    expect(b.items).toHaveLength(2);
  });

  it('reaches the deepest tier at six units', () => {
    const b = computePrice(schema, [makeDesign({ quantity: 6 })]);
    expect(b.ladderUnitPrice).toBe(4900);
    expect(b.total).toBe(4900 * 6);
  });

  it('every option is free — deltas add nothing', () => {
    const b = computePrice(schema, [makeDesign({ characterSelections: { body: 'steve' } })]);
    expect(b.total).toBe(7900);
  });
});

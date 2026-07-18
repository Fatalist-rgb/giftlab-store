import { describe, expect, it } from 'vitest';
import { FreeDefaultViolation } from '../src/errors.js';
import { parseProductSchema, safeParseProductSchema } from '../src/schema/validate.js';
import { rawSchema, rawSchemaPaidDefault } from './fixtures.js';

describe('parseProductSchema', () => {
  it('accepts a valid rev-3 schema and applies defaults', () => {
    const schema = parseProductSchema(rawSchema);
    expect(schema.status).toBe('published');
    expect(schema.physical.magneticBacking).toBe(true);
    expect(schema.constraints.rules).toEqual([]); // defaulted
    expect(schema.pricingRules.quantityLadder).toHaveLength(3);
  });

  it('rejects a schema whose default selection is not free (Constitution VIII)', () => {
    expect(() => parseProductSchema(rawSchemaPaidDefault)).toThrow(FreeDefaultViolation);
  });

  it('rejects structurally invalid input', () => {
    expect(() => parseProductSchema({ id: 'x' })).toThrow();
  });

  it('safeParse reports the free-default violation without throwing', () => {
    const res = safeParseProductSchema(rawSchemaPaidDefault);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.join(' ')).toMatch(/non-zero price delta/);
  });
});

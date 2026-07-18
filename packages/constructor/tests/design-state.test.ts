import { describe, expect, it } from 'vitest';
import { parseDesignState } from '../src/design-state/validate.js';
import { DesignStateInvalid } from '../src/errors.js';
import { parseProductSchema } from '../src/schema/validate.js';
import { makeDesign, rawSchema } from './fixtures.js';

const schema = parseProductSchema(rawSchema);

describe('parseDesignState', () => {
  it('accepts a valid design', () => {
    const design = parseDesignState(makeDesign(), schema);
    expect(design.characterSelections.body).toBe('robert');
  });

  it('rejects an unknown variant reference', () => {
    expect(() => parseDesignState(makeDesign({ characterSelections: { body: 'ghost' } }), schema)).toThrow(
      DesignStateInvalid,
    );
  });

  it('rejects a schema-version mismatch', () => {
    expect(() => parseDesignState(makeDesign({ schemaVersion: 99 }), schema)).toThrow(DesignStateInvalid);
  });

  it('rejects text longer than maxLen', () => {
    const design = makeDesign({ textValues: [{ fieldId: 'name', value: 'x'.repeat(30) }] });
    expect(() => parseDesignState(design, schema)).toThrow(DesignStateInvalid);
  });

  it('rejects a "ready" photo with no face layer', () => {
    expect(() => parseDesignState(makeDesign({ photoStatus: 'ready', faceLayer: null }), schema)).toThrow(
      DesignStateInvalid,
    );
  });

  it('accepts a deferred photo with a null face layer', () => {
    const design = parseDesignState(makeDesign({ photoStatus: 'deferred', faceLayer: null }), schema);
    expect(design.faceLayer).toBeNull();
  });
});

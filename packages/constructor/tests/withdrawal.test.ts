import { describe, expect, it } from 'vitest';
import { computeWithdrawalRight } from '../src/legal/withdrawal.js';
import { makeDesign } from './fixtures.js';

describe('computeWithdrawalRight — per line (art. 38 pkt 3 UPK)', () => {
  it('excludes a figurine carrying a face photo', () => {
    expect(computeWithdrawalRight(makeDesign())).toBe('excluded');
  });

  it('excludes a figurine carrying a custom name', () => {
    const design = makeDesign({ faceLayer: null, photoStatus: 'failed', textValues: [{ fieldId: 'name', value: 'Kuba' }] });
    expect(computeWithdrawalRight(design)).toBe('excluded');
  });

  it('excludes a deferred-photo order (personalization is still intended)', () => {
    expect(computeWithdrawalRight(makeDesign({ faceLayer: null, photoStatus: 'deferred' }))).toBe('excluded');
  });

  it('keeps the right for a line with no personalization', () => {
    const design = makeDesign({ faceLayer: null, photoStatus: 'failed', textValues: [{ fieldId: 'name', value: '   ' }] });
    expect(computeWithdrawalRight(design)).toBe('applies');
  });
});

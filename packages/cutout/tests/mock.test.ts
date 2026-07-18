import { describe, expect, it } from 'vitest';
import { createCutoutProvider, MockCutoutProvider } from '../src/index.js';

describe('cutout adapter', () => {
  it('resolves the mock provider by default', () => {
    expect(createCutoutProvider()).toBeInstanceOf(MockCutoutProvider);
  });

  it('mock returns a cutout for non-empty input', async () => {
    const res = await createCutoutProvider('mock').removeBackground({
      imageBytes: new Uint8Array([1, 2, 3]),
      mime: 'image/jpeg',
    });
    expect(res.ok).toBe(true);
    expect(res.mime).toBe('image/png');
    expect(res.imageBytes).toBeInstanceOf(Uint8Array);
  });

  it('mock fails cleanly on empty input', async () => {
    const res = await createCutoutProvider('mock').removeBackground({
      imageBytes: new Uint8Array([]),
      mime: 'image/jpeg',
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it('throws for a provider that is not wired yet', () => {
    expect(() => createCutoutProvider('removebg')).toThrow(/not wired/);
  });
});

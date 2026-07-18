import type { CutoutProvider, CutoutRequest, CutoutResult } from './types.js';

/**
 * Deterministic no-network provider: echoes the input bytes back as the "cutout" so the
 * upload → cutout → render pipeline runs end-to-end with no API key. Used in dev and tests.
 */
export class MockCutoutProvider implements CutoutProvider {
  readonly name = 'mock';

  async removeBackground(req: CutoutRequest): Promise<CutoutResult> {
    if (req.imageBytes.length === 0) {
      return { ok: false, error: 'empty image' };
    }
    return { ok: true, imageBytes: req.imageBytes, mime: 'image/png' };
  }
}

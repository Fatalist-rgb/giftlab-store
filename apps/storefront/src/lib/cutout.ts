import type { CutoutProvider, CutoutRequest, CutoutResult } from '@gl/cutout';

/**
 * Browser background-removal provider using @imgly/background-removal, which runs a small
 * segmentation model in the browser (WASM via onnxruntime-web). It implements the same
 * @gl/cutout port as the mock, so the constructor is unchanged. The package + model are
 * imported lazily, so the ~download happens only when a customer actually uploads a photo.
 *
 * On any failure it returns `{ ok: false }`; the constructor then leaves the photo unset,
 * and the customer can retry or defer the photo (order now, send it later — FR-013).
 *
 * NOTE (production hardening): by default @imgly fetches the model from its CDN. For the
 * real store, self-host the model and set `publicPath` so no third party sees the request
 * (privacy / CSP). Left on the default here for local development.
 */
export function createBrowserCutout(onProgress?: (phase: string, done: number, total: number) => void): CutoutProvider {
  return {
    name: 'imgly',
    async removeBackground(req: CutoutRequest): Promise<CutoutResult> {
      try {
        const { removeBackground } = await import('@imgly/background-removal');
        const input = new Blob([req.imageBytes as unknown as BlobPart], {
          type: req.mime || 'image/png',
        });
        const out = await removeBackground(input, {
          model: 'isnet_fp16',
          output: { format: 'image/png' },
          progress: onProgress,
        });
        const bytes = new Uint8Array(await out.arrayBuffer());
        return { ok: true, imageBytes: bytes, mime: 'image/png' };
      } catch (err) {
        return { ok: false, error: (err as Error).message };
      }
    },
  };
}

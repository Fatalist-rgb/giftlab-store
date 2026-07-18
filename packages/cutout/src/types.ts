/**
 * Provider-agnostic background-removal port. The product depends on this interface, not on
 * any one vendor, so remove.bg / Photoroom / Clipdrop can be swapped by config with no
 * change to the rest of the system (Constitution VII). The `mock` provider lets the whole
 * pipeline run with no API key during development.
 */

export interface CutoutRequest {
  /** raw image bytes to strip the background from */
  imageBytes: Uint8Array;
  /** mime of the input, e.g. image/jpeg */
  mime: string;
}

export interface CutoutResult {
  ok: boolean;
  /** PNG bytes with an alpha channel (only when ok) */
  imageBytes?: Uint8Array;
  mime?: string;
  /** provider/network failure — the caller falls back to "order now, send the photo later" */
  error?: string;
}

export interface CutoutProvider {
  readonly name: string;
  removeBackground(req: CutoutRequest): Promise<CutoutResult>;
}

export type CutoutProviderName = 'mock' | 'removebg' | 'photoroom' | 'clipdrop';

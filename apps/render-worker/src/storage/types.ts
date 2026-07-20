/**
 * Where a finished production package is stored. Local disk in development; the
 * Cloudflare R2 adapter implements this same port once the client's bucket exists,
 * so the worker never changes.
 */
export interface StoredObject {
  key: string;
  /** where the object can be found — a filesystem path locally, a URL in R2 */
  locator: string;
  bytes: number;
}

export interface PackageStorage {
  put(key: string, body: Uint8Array | string, contentType: string): Promise<StoredObject>;
}

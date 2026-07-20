import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/**
 * Resolve schema asset keys ("/art/body-blue.png") to raw bytes from a local directory.
 * In production the worker resolves the same keys from R2 — the shape of the map the
 * renderer consumes is identical either way.
 */
export async function loadLocalAssets(
  keys: Iterable<string>,
  publicDir: string,
): Promise<Map<string, Uint8Array>> {
  const root = resolve(publicDir);
  const out = new Map<string, Uint8Array>();
  for (const key of keys) {
    const relative = key.replace(/^\//, '');
    out.set(key, new Uint8Array(await readFile(join(root, relative))));
  }
  return out;
}

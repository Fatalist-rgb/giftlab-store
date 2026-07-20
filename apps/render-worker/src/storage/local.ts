import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { PackageStorage, StoredObject } from './types.js';

/**
 * Filesystem-backed package storage — the development stand-in for R2. Keys are used
 * as relative paths under `rootDir`, so a package lands in a readable folder you can
 * open and inspect (print PNG, cut SVG, spec JSON).
 */
export function createLocalStorage(rootDir: string): PackageStorage {
  const root = resolve(rootDir);
  return {
    async put(key, body, _contentType): Promise<StoredObject> {
      const target = join(root, key);
      await mkdir(dirname(target), { recursive: true });
      const bytes = typeof body === 'string' ? Buffer.from(body, 'utf8') : Buffer.from(body);
      await writeFile(target, bytes);
      return { key, locator: target, bytes: bytes.byteLength };
    },
  };
}

import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Vendors the MediaPipe vision WASM runtime out of node_modules into /public so the
 * face detector loads from OUR origin (no CDN request; the photo never needs one).
 * Runs on predev/prebuild — the wasm directory itself is gitignored.
 */
const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..');
const candidates = [
  join(app, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm'),
  join(app, '..', '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm'),
];
const src = candidates.find((p) => existsSync(p));
if (!src) {
  console.error('copy-mediapipe: @mediapipe/tasks-vision wasm not found — run pnpm install');
  process.exit(1);
}
const dest = join(app, 'public', 'models', 'face', 'wasm');
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`copy-mediapipe: wasm -> public/models/face/wasm`);

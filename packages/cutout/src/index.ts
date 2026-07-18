import { MockCutoutProvider } from './mock.js';
import type { CutoutProvider, CutoutProviderName } from './types.js';

export * from './types.js';
export { MockCutoutProvider } from './mock.js';

/**
 * Resolve a provider by name. Only `mock` is wired today; the hosted providers are stubbed
 * until the client supplies an API key (see .env.example CUTOUT_PROVIDER / CUTOUT_API_KEY).
 */
export function createCutoutProvider(name: CutoutProviderName = 'mock'): CutoutProvider {
  switch (name) {
    case 'mock':
      return new MockCutoutProvider();
    case 'removebg':
    case 'photoroom':
    case 'clipdrop':
      throw new Error(`cutout provider "${name}" is not wired yet — needs CUTOUT_API_KEY`);
    default: {
      const exhaustive: never = name;
      throw new Error(`unknown cutout provider "${String(exhaustive)}"`);
    }
  }
}

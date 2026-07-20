import { parseProductSchema, type ProductSchema } from '@gl/constructor';

/**
 * Store API client for the Medusa backend. Configure with:
 *   MEDUSA_BACKEND_URL=http://localhost:9000
 *   MEDUSA_PUBLISHABLE_KEY=pk_...
 *
 * When these are unset — or the backend is unreachable — the storefront falls back to
 * the local demo schema, so the constructor keeps working without a backend.
 */
const BASE = process.env.MEDUSA_BACKEND_URL;
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;

/** The Medusa product whose constructor schema this storefront renders. */
export const FIGURINE_PRODUCT_ID = process.env.MEDUSA_FIGURINE_PRODUCT_ID ?? 'prod_belly';

export const backendConfigured = Boolean(BASE && KEY);

async function storeFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'x-publishable-api-key': KEY as string,
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
    // a hung backend must not stall the page — fall back to the demo schema instead
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

/**
 * The published ProductSchema for a product, re-validated by the engine on arrival.
 * Returns null when the backend is not configured or the fetch/validation fails — the
 * caller then falls back to the local demo schema.
 */
export async function fetchProductSchema(productId: string): Promise<ProductSchema | null> {
  if (!backendConfigured) return null;
  try {
    const data = (await storeFetch(`/store/gl/products/${encodeURIComponent(productId)}/schema`)) as {
      schema?: unknown;
    };
    if (!data?.schema) return null;
    return parseProductSchema(data.schema);
  } catch (err) {
    console.warn(`[storefront] falling back to the demo schema: ${(err as Error).message}`);
    return null;
  }
}

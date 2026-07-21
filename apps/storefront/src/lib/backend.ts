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
    // ISR: cache the response and refresh it periodically, so the product/content pages
    // are fast (CDN-served) yet pick up backend edits within a few minutes
    next: { revalidate: 300 },
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

export interface ContentPage {
  slug: string;
  locale: string;
  title: string;
  body: string;
  meta_title?: string | null;
  meta_description?: string | null;
}

/** An admin-editable content/legal page for a locale (backend falls back to Polish). */
export async function fetchContentPage(slug: string, locale: string): Promise<ContentPage | null> {
  if (!backendConfigured) return null;
  try {
    return (await storeFetch(
      `/store/gl/content/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
    )) as ContentPage;
  } catch {
    return null;
  }
}

export interface CatalogProduct {
  id: string;
  title: string;
  handle: string | null;
  description: string | null;
  basePriceGrosz: number | null;
  ladder: Array<{ minQty: number; unitPrice: number }>;
  thumbnail: string | null;
  variantCount: number;
}

export interface CatalogCategory {
  id: string;
  name: string;
  description: string | null;
  products: CatalogProduct[];
}

/**
 * The GL catalogue: active categories with orderable products (published schema =
 * price authority). Empty when the backend is off — the page shows its empty state.
 */
export async function fetchCatalog(): Promise<CatalogCategory[]> {
  if (!backendConfigured) return [];
  try {
    const data = (await storeFetch(`/store/gl/catalog`)) as { categories?: CatalogCategory[] };
    return data.categories ?? [];
  } catch (err) {
    console.warn(`[storefront] catalog unavailable: ${(err as Error).message}`);
    return [];
  }
}

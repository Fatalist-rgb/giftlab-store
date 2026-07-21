import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/gl/add-to-cart — the storefront-side bridge for the constructor. Persists
 * the design on the Medusa backend (which re-validates it with the engine and computes
 * the authoritative price) and builds a cart from it. The publishable key stays on the
 * server — the browser never talks to Medusa directly here.
 */
const BASE = process.env.MEDUSA_BACKEND_URL;
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;
const PRODUCT = process.env.MEDUSA_FIGURINE_PRODUCT_ID ?? 'figurka-z-brzuszkiem';

export async function POST(req: NextRequest) {
  if (!BASE || !KEY) {
    return NextResponse.json({ message: 'backend is not configured' }, { status: 503 });
  }
  const payload = (await req.json()) as {
    design?: unknown;
    designs?: unknown[];
    cartId?: string | null;
    productId?: string;
  };
  // several different designs in one order (T042); the single-design shape stays accepted
  const designs = Array.isArray(payload.designs)
    ? payload.designs
    : payload.design
      ? [payload.design]
      : [];
  if (!designs.length || designs.some((d) => !d || typeof d !== 'object')) {
    return NextResponse.json({ message: 'design(s) required' }, { status: 400 });
  }
  // catalog products send their handle; anything but a plain handle/id falls back to the flagship
  const product =
    typeof payload.productId === 'string' && /^[a-z0-9_-]{1,80}$/.test(payload.productId)
      ? payload.productId
      : PRODUCT;

  const headers = {
    'content-type': 'application/json',
    'x-publishable-api-key': KEY,
  };

  // 1. persist + validate every design (server-side price authority)
  const designIds: string[] = [];
  for (const design of designs) {
    const dRes = await fetch(`${BASE}/store/gl/designs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId: product, design }),
      signal: AbortSignal.timeout(10000),
    });
    const dBody = (await dRes.json()) as { designId?: string; message?: string; detail?: string };
    if (!dRes.ok || !dBody.designId) {
      return NextResponse.json(
        { message: dBody.message ?? 'design rejected', detail: dBody.detail },
        { status: dRes.status || 422 },
      );
    }
    designIds.push(dBody.designId);
  }

  // 2. one cart from all designs — the ladder prices the TOTAL quantity
  const cRes = await fetch(`${BASE}/store/gl/carts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: product, designIds, cartId: payload.cartId ?? undefined }),
    signal: AbortSignal.timeout(15000),
  });
  const cBody = (await cRes.json()) as Record<string, unknown>;
  if (!cRes.ok) {
    return NextResponse.json({ message: 'cart failed', detail: cBody }, { status: cRes.status });
  }

  return NextResponse.json({ designIds, ...cBody }, { status: 201 });
}

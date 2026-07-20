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
  const { design, cartId } = (await req.json()) as { design?: unknown; cartId?: string | null };
  if (!design || typeof design !== 'object') {
    return NextResponse.json({ message: 'design object is required' }, { status: 400 });
  }

  const headers = {
    'content-type': 'application/json',
    'x-publishable-api-key': KEY,
  };

  // 1. persist + validate the design (server-side price authority)
  const dRes = await fetch(`${BASE}/store/gl/designs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: PRODUCT, design }),
    signal: AbortSignal.timeout(10000),
  });
  const dBody = (await dRes.json()) as { designId?: string; message?: string; detail?: string };
  if (!dRes.ok || !dBody.designId) {
    return NextResponse.json(
      { message: dBody.message ?? 'design rejected', detail: dBody.detail },
      { status: dRes.status || 422 },
    );
  }

  // 2. cart from the design (cart merging with an existing cart comes with the cart UI)
  const cRes = await fetch(`${BASE}/store/gl/carts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: PRODUCT, designIds: [dBody.designId], cartId: cartId ?? undefined }),
    signal: AbortSignal.timeout(10000),
  });
  const cBody = (await cRes.json()) as Record<string, unknown>;
  if (!cRes.ok) {
    return NextResponse.json({ message: 'cart failed', detail: cBody }, { status: cRes.status });
  }

  return NextResponse.json({ designId: dBody.designId, ...cBody }, { status: 201 });
}

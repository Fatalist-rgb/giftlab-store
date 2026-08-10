import { NextRequest, NextResponse } from 'next/server';

/** POST /api/gl/cart-simple — add an ordinary catalogue product to the cart. */
const BASE = process.env.MEDUSA_BACKEND_URL;
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;

export async function POST(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ message: 'backend is not configured' }, { status: 503 });
  const body = await req.json();
  const res = await fetch(`${BASE}/store/gl/carts/simple`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-publishable-api-key': KEY },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

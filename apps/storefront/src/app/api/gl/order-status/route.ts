import { NextRequest, NextResponse } from 'next/server';

/** GET /api/gl/order-status?id=order_… — customer order status proxy. */
const BASE = process.env.MEDUSA_BACKEND_URL;
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;

export async function GET(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ message: 'backend is not configured' }, { status: 503 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id is required' }, { status: 400 });
  const res = await fetch(`${BASE}/store/gl/orders/${encodeURIComponent(id)}/status`, {
    headers: { 'x-publishable-api-key': KEY },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

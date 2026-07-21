import { NextRequest, NextResponse } from 'next/server';

/** Reviews proxy — the publishable key stays server-side. */
const BASE = process.env.MEDUSA_BACKEND_URL;
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;
const PRODUCT = process.env.MEDUSA_FIGURINE_PRODUCT_ID ?? 'figurka-z-brzuszkiem';

export async function GET() {
  if (!BASE || !KEY) return NextResponse.json({ summary: { count: 0, average: null, distribution: {} }, reviews: [] });
  const res = await fetch(`${BASE}/store/gl/reviews?productId=${encodeURIComponent(PRODUCT)}`, {
    headers: { 'x-publishable-api-key': KEY },
    next: { revalidate: 120 },
    signal: AbortSignal.timeout(8000),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function POST(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ message: 'backend is not configured' }, { status: 503 });
  const body = await req.json();
  const res = await fetch(`${BASE}/store/gl/reviews`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-publishable-api-key': KEY },
    body: JSON.stringify({ ...body, productId: PRODUCT }),
    signal: AbortSignal.timeout(8000),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

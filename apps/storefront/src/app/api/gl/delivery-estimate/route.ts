import { NextResponse } from 'next/server';

/** Delivery window proxy (cached briefly — the window moves once a day at most). */
const BASE = process.env.MEDUSA_BACKEND_URL;
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;

export async function GET() {
  if (!BASE || !KEY) return NextResponse.json({ message: 'backend is not configured' }, { status: 503 });
  const res = await fetch(`${BASE}/store/gl/delivery-estimate`, {
    headers: { 'x-publishable-api-key': KEY },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

import { NextRequest, NextResponse } from 'next/server';

/** POST /api/gl/consent — proxy the cookie-consent record to the backend (key stays here). */
const BASE = process.env.MEDUSA_BACKEND_URL;
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;

export async function POST(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ ok: false }, { status: 503 });
  const body = await req.json();
  const res = await fetch(`${BASE}/store/gl/consent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-publishable-api-key': KEY },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

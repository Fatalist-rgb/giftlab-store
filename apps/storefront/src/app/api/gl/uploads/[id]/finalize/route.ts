import { NextRequest, NextResponse } from 'next/server';

/** POST /api/gl/uploads/:id/finalize — proxy to the backend's photo finalize step. */
const BASE = process.env.MEDUSA_BACKEND_URL;
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!BASE || !KEY) return NextResponse.json({ message: 'backend is not configured' }, { status: 503 });
  const { id } = await ctx.params;
  const body = await req.json();
  const res = await fetch(`${BASE}/store/gl/uploads/${encodeURIComponent(id)}/finalize`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-publishable-api-key': KEY },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

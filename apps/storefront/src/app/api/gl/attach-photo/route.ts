import { NextRequest, NextResponse } from 'next/server';

/** POST /api/gl/attach-photo — attach a finalized upload to an awaiting order line. */
const BASE = process.env.MEDUSA_BACKEND_URL;
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;

export async function POST(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ message: 'backend is not configured' }, { status: 503 });
  const { orderId, lineItemId, uploadId } = (await req.json()) as {
    orderId?: string;
    lineItemId?: string;
    uploadId?: string;
  };
  if (!orderId || !lineItemId || !uploadId) {
    return NextResponse.json({ message: 'orderId, lineItemId and uploadId are required' }, { status: 400 });
  }
  const res = await fetch(
    `${BASE}/store/gl/orders/${encodeURIComponent(orderId)}/lines/${encodeURIComponent(lineItemId)}/photo`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-publishable-api-key': KEY },
      body: JSON.stringify({ uploadId }),
      signal: AbortSignal.timeout(15000),
    },
  );
  return NextResponse.json(await res.json(), { status: res.status });
}

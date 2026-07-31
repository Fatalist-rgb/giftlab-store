import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/gl/complete — turn a paid cart into an order. Used by the return page after
 * a redirect payment (Przelewy24): the provider's status notification authorises the
 * payment session asynchronously, so completion may need a moment. Answers 409 while
 * the payment is not authorised yet; the page retries a few times before telling the
 * customer we will confirm by e-mail.
 */
const BASE = process.env.MEDUSA_BACKEND_URL;
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;

export async function POST(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ message: 'backend is not configured' }, { status: 503 });
  const { cartId } = (await req.json()) as { cartId?: string };
  if (!cartId) return NextResponse.json({ message: 'cartId is required' }, { status: 400 });

  const res = await fetch(`${BASE}/store/carts/${encodeURIComponent(cartId)}/complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-publishable-api-key': KEY },
    signal: AbortSignal.timeout(20000),
  });
  const body = (await res.json()) as
    | { type: 'order'; order: { id: string; display_id: number; total: number; currency_code: string; email: string } }
    | { type: 'cart'; error?: { message?: string } };

  if (body.type !== 'order') {
    return NextResponse.json(
      { message: body.error?.message ?? 'payment not confirmed yet', pending: true },
      { status: 409 },
    );
  }
  return NextResponse.json({
    orderId: body.order.id,
    displayId: body.order.display_id,
    total: body.order.total,
    currency: body.order.currency_code,
    email: body.order.email,
  });
}

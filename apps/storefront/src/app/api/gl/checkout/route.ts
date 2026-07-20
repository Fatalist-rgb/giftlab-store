import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/gl/checkout — server-orchestrated guest checkout for the MVP payment setup
 * (system provider; Przelewy24 becomes its own redirect stage when the client's merchant
 * account exists). Steps against the Medusa store API: set email + addresses → pick the
 * courier shipping option → payment collection + session → complete the cart.
 * Body: { cartId, email, address: { firstName, lastName, address1, city, postalCode, phone? } }.
 */
const BASE = process.env.MEDUSA_BACKEND_URL;
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;

type Address = {
  firstName?: string;
  lastName?: string;
  address1?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
};

async function store(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-publishable-api-key': KEY as string,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15000),
  });
}

export async function POST(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ message: 'backend is not configured' }, { status: 503 });
  const body = (await req.json()) as { cartId?: string; email?: string; address?: Address };
  const { cartId, email, address } = body;
  const a = address ?? {};
  if (!cartId || !email || !a.firstName || !a.lastName || !a.address1 || !a.city || !a.postalCode) {
    return NextResponse.json({ message: 'cartId, email and the full address are required' }, { status: 400 });
  }

  const medusaAddress = {
    first_name: a.firstName,
    last_name: a.lastName,
    address_1: a.address1,
    city: a.city,
    postal_code: a.postalCode,
    phone: a.phone || undefined,
    country_code: 'pl',
  };

  // 1. email + addresses
  const upd = await store(`/store/carts/${encodeURIComponent(cartId)}`, {
    method: 'POST',
    body: JSON.stringify({ email, shipping_address: medusaAddress, billing_address: medusaAddress }),
  });
  if (!upd.ok) {
    return NextResponse.json({ message: 'address step failed' }, { status: upd.status });
  }

  // 2. shipping method (single courier option for PL)
  const soRes = await store(`/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`);
  const soBody = (await soRes.json()) as { shipping_options?: Array<{ id: string }> };
  const optionId = soBody.shipping_options?.[0]?.id;
  if (!optionId) {
    return NextResponse.json({ message: 'no shipping option available' }, { status: 409 });
  }
  const sm = await store(`/store/carts/${encodeURIComponent(cartId)}/shipping-methods`, {
    method: 'POST',
    body: JSON.stringify({ option_id: optionId }),
  });
  if (!sm.ok) return NextResponse.json({ message: 'shipping step failed' }, { status: sm.status });

  // 3. payment collection + session (system provider until P24 credentials exist)
  const pcRes = await store('/store/payment-collections', {
    method: 'POST',
    body: JSON.stringify({ cart_id: cartId }),
  });
  const pcBody = (await pcRes.json()) as { payment_collection?: { id: string } };
  const pcId = pcBody.payment_collection?.id;
  if (!pcId) return NextResponse.json({ message: 'payment collection failed' }, { status: 502 });
  const ps = await store(`/store/payment-collections/${pcId}/payment-sessions`, {
    method: 'POST',
    body: JSON.stringify({ provider_id: 'pp_system_default' }),
  });
  if (!ps.ok) return NextResponse.json({ message: 'payment session failed' }, { status: ps.status });

  // 4. complete
  const doneRes = await store(`/store/carts/${encodeURIComponent(cartId)}/complete`, { method: 'POST' });
  const done = (await doneRes.json()) as
    | { type: 'order'; order: { id: string; display_id: number; total: number; currency_code: string; email: string } }
    | { type: 'cart'; error?: { message?: string } };
  if (done.type !== 'order') {
    return NextResponse.json(
      { message: done.error?.message ?? 'cart completion failed' },
      { status: 422 },
    );
  }

  return NextResponse.json({
    orderId: done.order.id,
    displayId: done.order.display_id,
    total: done.order.total,
    currency: done.order.currency_code,
    email: done.order.email,
  });
}

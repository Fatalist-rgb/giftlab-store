import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/gl/cart?id=cart_… — trimmed cart summary for the cart page. Proxies the
 * Medusa store API so the publishable key stays on the server.
 */
const BASE = process.env.MEDUSA_BACKEND_URL;
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;

export async function GET(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ message: 'backend is not configured' }, { status: 503 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id is required' }, { status: 400 });

  const res = await fetch(`${BASE}/store/carts/${encodeURIComponent(id)}`, {
    headers: { 'x-publishable-api-key': KEY },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return NextResponse.json({ message: 'cart not found' }, { status: res.status });

  const { cart } = (await res.json()) as {
    cart: {
      id: string;
      email?: string | null;
      currency_code: string;
      item_total: number;
      total: number;
      completed_at?: string | null;
      items?: Array<{
        id: string;
        title?: string | null;
        product_title?: string | null;
        quantity: number;
        unit_price: number;
        total: number;
        metadata?: Record<string, unknown> | null;
      }>;
    };
  };

  res.headers.get('content-type');
  return NextResponse.json({
    id: cart.id,
    email: cart.email ?? null,
    currency: cart.currency_code,
    itemTotal: cart.item_total,
    total: cart.total,
    completed: Boolean(cart.completed_at),
    items: (cart.items ?? []).map((i) => ({
      id: i.id,
      title: i.product_title || i.title || 'Figurka',
      quantity: i.quantity,
      unitPrice: i.unit_price,
      total: i.total,
      designId: (i.metadata?.design_id as string | undefined) ?? null,
    })),
  });
}

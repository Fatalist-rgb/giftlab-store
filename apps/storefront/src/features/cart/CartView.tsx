'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';

type CartItem = {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  total: number;
  designId: string | null;
};
type Cart = {
  id: string;
  currency: string;
  itemTotal: number;
  total: number;
  completed: boolean;
  items: CartItem[];
};
type OrderResult = { displayId: number; total: number; currency: string; email: string };

const money = (v: number, currency: string) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: currency.toUpperCase() }).format(v);

/**
 * The cart + guest checkout page. Reads the cart id the constructor stored, shows the
 * lines, and submits a one-step checkout (address → courier → payment → order). The
 * per-line withdrawal notice sits next to the pay button (FR-030): personalized lines
 * are excluded from the 14-day right (art. 38 pkt 3), and ordering acknowledges that.
 */
export function CartView() {
  const t = useTranslations('cart');
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('gl_cart_id');
    if (!id) {
      setLoading(false);
      return;
    }
    fetch(`/api/gl/cart?id=${encodeURIComponent(id)}`)
      .then(async (r) => (r.ok ? ((await r.json()) as Cart) : null))
      .then((c) => setCart(c && !c.completed ? c : null))
      .catch(() => setCart(null))
      .finally(() => setLoading(false));
  }, []);

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart) return;
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch('/api/gl/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cartId: cart.id,
          email,
          address: { firstName, lastName, address1, city, postalCode, phone },
        }),
      });
      const body = (await res.json()) as OrderResult & { message?: string };
      if (!res.ok) throw new Error(body.message || 'checkout failed');
      localStorage.removeItem('gl_cart_id');
      setOrder(body);
    } catch {
      setError(t('error'));
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return <main className="mx-auto max-w-2xl px-5 py-16 text-center opacity-60">{t('loading')}</main>;
  }

  if (order) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <span className="inline-block rounded-full border-2 border-ink bg-lime px-3 py-1 text-sm font-bold shadow-offset-sm">
          {t('orderBadge')}
        </span>
        <h1 className="mt-5 font-display text-4xl font-extrabold" data-testid="order-ok">
          {t('orderTitle', { number: order.displayId })}
        </h1>
        <p className="mt-4 text-lg opacity-75">
          {t('orderSub', { total: money(order.total, order.currency), email: order.email })}
        </p>
        <Link href="/product" className="mt-8 inline-block rounded-2xl border-2 border-ink bg-mandarin px-6 py-3 font-display font-bold text-white shadow-offset">
          {t('orderAgain')}
        </Link>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl font-extrabold">{t('emptyTitle')}</h1>
        <p className="mt-3 opacity-70">{t('emptySub')}</p>
        <Link href="/product" className="mt-6 inline-block rounded-2xl border-2 border-ink bg-mandarin px-6 py-3 font-display font-bold text-white shadow-offset">
          {t('emptyCta')}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl font-extrabold">{t('title')}</h1>

      {/* lines */}
      <div className="mt-6 space-y-3">
        {cart.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-2xl border-2 border-ink bg-cream p-4 shadow-offset-sm">
            <div>
              <p className="font-display font-bold">{item.title}</p>
              <p className="text-sm opacity-60">
                {item.quantity} × {money(item.unitPrice, cart.currency)}
                {item.designId ? ` · ${t('personalized')}` : ''}
              </p>
            </div>
            <span className="font-display text-lg font-bold">{money(item.total, cart.currency)}</span>
          </div>
        ))}
      </div>

      {/* checkout form */}
      <form onSubmit={placeOrder} className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold">{t('deliveryTitle')}</h2>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="w-full rounded-xl border-2 border-ink px-4 py-2.5" data-testid="email" />
        <div className="grid grid-cols-2 gap-3">
          <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t('firstName')} className="rounded-xl border-2 border-ink px-4 py-2.5" />
          <input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t('lastName')} className="rounded-xl border-2 border-ink px-4 py-2.5" />
        </div>
        <input required value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder={t('address')} className="w-full rounded-xl border-2 border-ink px-4 py-2.5" />
        <div className="grid grid-cols-2 gap-3">
          <input required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder={t('postal')} className="rounded-xl border-2 border-ink px-4 py-2.5" />
          <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('city')} className="rounded-xl border-2 border-ink px-4 py-2.5" />
        </div>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('phone')} className="w-full rounded-xl border-2 border-ink px-4 py-2.5" />

        {/* totals */}
        <div className="mt-4 rounded-2xl border-2 border-ink bg-cream p-4 shadow-offset-sm">
          <div className="flex justify-between text-sm opacity-70">
            <span>{t('items')}</span>
            <span>{money(cart.itemTotal, cart.currency)}</span>
          </div>
          <div className="flex justify-between text-sm opacity-70">
            <span>{t('shipping')}</span>
            <span>{t('shippingCourier')}</span>
          </div>
        </div>

        {/* withdrawal notice beside the pay button — FR-030 */}
        <p className="text-xs leading-relaxed opacity-60" data-testid="withdrawal-notice">
          {t('withdrawalNotice')}
        </p>

        {error && <p className="rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-900">{error}</p>}

        <button type="submit" disabled={placing} data-testid="place-order" className="w-full rounded-2xl border-2 border-ink bg-mandarin py-3 font-display font-bold text-white shadow-offset disabled:opacity-60">
          {placing ? '…' : t('placeOrder')}
        </button>
        <p className="text-center text-xs opacity-50">{t('paymentNote')}</p>
      </form>
    </main>
  );
}

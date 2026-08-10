'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Guarantee } from '@/components/Guarantee';
import { ArrowR, CheckIcon, Sparkle } from '@/components/icons';
import { DeliveryRow, EmptyCartArt, ItemThumb, SHIP_COURIER_PLN, itemMeta, pluralKey, zl } from './bits';

export type CartItem = {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  total: number;
  designId: string | null;
  pose?: string | null;
  printedName?: string | null;
  thumbnail?: string | null;
};
export type Cart = {
  id: string;
  currency: string;
  itemTotal: number;
  total: number;
  completed: boolean;
  items: CartItem[];
};

/** The quantity ladder, for the honest bulk hint — display only; Medusa holds the
 *  authoritative prices, written per line when the cart was built. */
const LADDER = [
  { min: 6, unit: 49 },
  { min: 3, unit: 65 },
  { min: 1, unit: 79 },
];
const unitFor = (n: number) => LADDER.find((l) => n >= l.min)?.unit ?? 79;
const nextTier = (n: number) => (n < 3 ? 3 : n < 6 ? 6 : null);

/**
 * The cart, in the approved design: lines on the left, a cream summary aside on the
 * right, and the honest bulk hint — the ladder, never a timer. Quantity is chosen in
 * the constructor (it drives the ladder repricing there), so lines here are a receipt
 * preview, not steppers: editing a line would silently change every OTHER line's
 * tier price, and that is a backend repricing job, not a UI toggle.
 */
export function CartView() {
  const t = useTranslations('cart');
  const locale = useLocale();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    fetch('/api/gl/delivery-estimate')
      .then(async (r) => (r.ok ? await r.json() : null))
      .then((d) => d && setDelivery(d))
      .catch(() => {});
  }, []);

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

  if (loading) {
    return <main className="mx-auto max-w-2xl px-5 py-16 text-center opacity-60">{t('loading')}</main>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 text-center sm:py-14">
        <EmptyCartArt />
        <h1 className="mt-6 font-display text-2xl font-extrabold sm:text-3xl">{t('emptyTitle')}</h1>
        <p className="mx-auto mt-2 max-w-md opacity-70">{t('emptySub')}</p>
        <Link href="/product" className="btn-p mt-7">
          {t('emptyCta')}
          <ArrowR />
        </Link>
        <div className="mx-auto mt-12 max-w-sm text-left">
          <Guarantee />
        </div>
      </main>
    );
  }

  const count = cart.items.reduce((s, i) => s + i.quantity, 0);
  // the ladder spans FIGURINES only — ordinary catalogue goods neither count toward
  // a tier nor get tier pricing, so the hint must not count them either
  const figCount = cart.items.filter((i) => i.designId).reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.itemTotal;
  const ship = SHIP_COURIER_PLN;
  const total = subtotal + ship;

  // the honest bulk hint: the next tier when it is close, the unlocked tier otherwise
  const nt = nextTier(figCount);
  const need = nt ? nt - figCount : 0;
  const showUpsell = figCount > 0 && !!nt && need <= 2;
  const bulkActive = figCount > 0 && unitFor(figCount) < 79;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <h1 className="m-0 flex flex-wrap items-center gap-3 font-display text-3xl font-extrabold sm:text-4xl">
        {t('title')}
        <span className="stkr bg-pink text-[13px] text-white" style={{ transform: 'rotate(2deg)' }}>
          {count} {t(pluralKey(count))}
        </span>
        <Sparkle s={26} />
      </h1>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-4">
          {(showUpsell || bulkActive) && (
            <div
              className="flex items-start gap-3 rounded-[var(--r-card)] p-4 b2 sh"
              style={{ background: showUpsell ? 'var(--lime)' : 'var(--cream)', transform: 'rotate(-.5deg)' }}
            >
              <span className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-2 border-ink bg-white">
                {showUpsell ? <Sparkle s={18} /> : <CheckIcon s={17} />}
              </span>
              <div className="min-w-0">
                <p className="m-0 font-display font-extrabold leading-snug">
                  {showUpsell
                    ? t('bulkTo', { n: need, p: zl(unitFor(nt!)) })
                    : t('bulkActive', { p: zl(unitFor(figCount)) })}
                </p>
                <p className="m-0 mt-1 text-xs opacity-75">{t('bulkDiff')}</p>
                <p className="m-0 mt-1.5 text-xs font-semibold opacity-90">{t('bulkLadder')}</p>
              </div>
            </div>
          )}

          {cart.items.map((item) => (
            <div key={item.id} className="rounded-[var(--r-card)] bg-white p-4 b2 sh sm:p-5">
              <div className="flex gap-3 sm:gap-5">
                <div className="shrink-0 pt-1">
                  <ItemThumb pose={item.pose} thumbnail={item.thumbnail} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 font-display text-lg font-bold leading-tight sm:text-xl">
                    {item.designId ? t('prodName') : item.title}
                  </h3>
                  <p className="m-0 mt-0.5 text-[13px] opacity-60">{itemMeta(t, item)}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 sm:mt-4">
                    <span className="stkr bg-white text-[13px]">× {item.quantity}</span>
                    <div className="ml-auto text-right">
                      <div className="font-display text-xl font-extrabold sm:text-2xl">{zl(item.total)}</div>
                      {item.quantity > 1 && (
                        <div className="text-xs opacity-55">
                          {item.quantity} × {zl(item.unitPrice)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-1 text-sm">
            <Link href="/#szablony" className="underline underline-offset-2 opacity-70 hover:opacity-100">
              {t('continue')}
            </Link>
          </div>
        </div>

        <aside className="rounded-[var(--r-card)] bg-cream p-5 b2 sh lg:sticky lg:top-[120px] sm:p-6">
          <h2 className="m-0 flex items-center gap-2 font-display text-xl font-extrabold">
            {t('summaryH')}
            <Sparkle s={18} />
          </h2>
          <div className="mt-4 flex flex-col gap-2.5 text-[15px]">
            <div className="flex justify-between gap-3">
              <span>{t('sub')}</span>
              <b className="font-display">{zl(subtotal)}</b>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>
                {t('ship')}
                <span className="block text-xs opacity-55">{t('shipKurier')}</span>
              </span>
              <b className="font-display">{zl(ship)}</b>
            </div>
          </div>
          <div className="my-4" style={{ borderTop: '2px dashed rgba(23,19,26,.25)' }} />
          <div className="flex items-end justify-between gap-3">
            <span className="font-display text-lg font-bold">{t('totalWord')}</span>
            <span className="font-display text-3xl font-extrabold" data-testid="cart-total">
              {zl(total)}
            </span>
          </div>
          {delivery && (
            <div className="mt-4">
              <DeliveryRow label={t('delLbl')} from={delivery.from} to={delivery.to} locale={locale} />
            </div>
          )}
          <Link href="/checkout" className="btn-p mt-5 w-full" data-testid="go-checkout">
            {t('checkout')}
            <ArrowR />
          </Link>
          <div className="mt-5 pt-4" style={{ borderTop: '2px dashed rgba(23,19,26,.25)' }}>
            <Guarantee compact />
          </div>
        </aside>
      </div>
    </main>
  );
}

'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { PayMarks } from '@/components/PayMarks';
import { ArrowR, CheckIcon, Sparkle } from '@/components/icons';
import { DeliveryRow, ItemThumb, SHIP_COURIER_PLN, itemMeta, zl } from './bits';
import type { Cart } from './CartView';

const maskZip = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 5);
  return d.length > 2 ? `${d.slice(0, 2)}-${d.slice(2)}` : d;
};

/** A labelled input in the approved skin — label above, pink asterisk, error below. */
function Field({
  id, label, ph, value, err, onChange, span2, inputMode, autoComplete, testId,
}: {
  id: string;
  label: string;
  ph: string;
  value: string;
  err?: string | null;
  onChange: (v: string) => void;
  span2?: boolean;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
  autoComplete?: string;
  testId?: string;
}) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-[12px] font-bold uppercase tracking-wide opacity-60" htmlFor={id}>
        {label} <span className="text-pink">*</span>
      </label>
      <input
        id={id}
        value={value}
        placeholder={ph}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={!!err}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[12px] border-2 bg-white px-3.5 py-2.5 text-[15px]"
        style={{ borderColor: err ? 'var(--pink)' : 'var(--ink)' }}
      />
      {err && <p className="m-0 mt-1 text-xs font-semibold text-pink">{err}</p>}
    </div>
  );
}

/** Numbered section heading — the demo's checkout rhythm. */
function SecTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="m-0 flex items-center gap-2.5 font-display text-xl font-extrabold">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-mandarin font-display text-[13px] font-extrabold text-white">
        {n}
      </span>
      {children}
    </h2>
  );
}

/** A selected option card (radio look) — delivery and payment each have exactly one. */
function OptionCard({ name, desc, right, rot = 0 }: { name: string; desc: string; right: React.ReactNode; rot?: number }) {
  return (
    <div
      className="flex items-center gap-3 rounded-[16px] border-2 border-ink bg-white p-3.5 shs"
      role="radio"
      aria-checked="true"
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-[2.5px] border-ink bg-mandarin">
        <span className="h-[9px] w-[9px] rounded-full bg-white" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-bold leading-tight">{name}</span>
        <span className="mt-0.5 block text-xs opacity-65">{desc}</span>
      </span>
      <span className="shrink-0">{right}</span>
    </div>
  );
}

/**
 * Checkout, split out of the cart as in the approved design. One page, three numbered
 * sections: address, the delivery option checkout actually charges, and payment that
 * happens on Przelewy24's side — no card fields here, ever. Both consents are required
 * (terms + privacy), and the withdrawal-right notice sits NEXT TO the pay button
 * (FR-030): the buyer must see what they give up at the exact moment of paying.
 */
export function CheckoutView() {
  const t = useTranslations('checkout');
  const tc = useTranslations('cart');
  const locale = useLocale();
  const router = useRouter();

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<{ from: string; to: string } | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [terms, setTerms] = useState(false);
  const [priv, setPriv] = useState(false);
  const [tried, setTried] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(false);

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
    return <main className="mx-auto max-w-2xl px-5 py-16 text-center opacity-60">{tc('loading')}</main>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl font-extrabold">{t('emptyH')}</h1>
        <p className="mt-3 opacity-70">{t('emptyP')}</p>
        <Link href="/product" className="btn-p mt-6">
          {t('emptyCta')}
          <ArrowR />
        </Link>
      </main>
    );
  }

  const subtotal = cart.itemTotal;
  const ship = SHIP_COURIER_PLN;
  const total = subtotal + ship;

  const errs = {
    name: !name.trim() ? t('errReq') : null,
    email: !email.trim() ? t('errReq') : !/^\S+@\S+\.\S+$/.test(email) ? t('errEmail') : null,
    street: !street.trim() ? t('errReq') : null,
    zip: !zip.trim() ? t('errReq') : !/^\d{2}-\d{3}$/.test(zip) ? t('errZip') : null,
    city: !city.trim() ? t('errReq') : null,
  };
  const formOk = !Object.values(errs).some(Boolean);
  const consentsOk = terms && priv;
  const show = (k: keyof typeof errs) => (tried ? errs[k] : null);

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!formOk || !consentsOk) return;
    setPlacing(true);
    setError(false);
    try {
      // Medusa wants first/last; the form asks the human question (one field, like the
      // demo) and the split happens here: first word vs the rest
      const parts = name.trim().split(/\s+/);
      const firstName = parts.shift() ?? '';
      const lastName = parts.join(' ') || '—';
      const res = await fetch('/api/gl/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cartId: cart.id,
          email,
          address: { firstName, lastName, address1: street, city, postalCode: zip, phone },
        }),
      });
      const body = (await res.json()) as { orderId?: string; message?: string; redirectUrl?: string };
      if (!res.ok) throw new Error(body.message || 'checkout failed');
      if (body.redirectUrl) {
        // BLIK / przelew / karta happen on the provider's page; the order is created on return
        window.location.href = body.redirectUrl;
        return;
      }
      localStorage.removeItem('gl_cart_id');
      router.push(`/order/${body.orderId}`);
    } catch {
      setError(true);
      setPlacing(false);
    }
  };

  const consentBox = (checked: boolean) =>
    ({
      background: checked ? 'var(--lime)' : '#fff',
    }) as React.CSSProperties;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <h1 className="m-0 flex items-center gap-3 font-display text-3xl font-extrabold sm:text-4xl">
        {t('coTitle')}
        <Sparkle s={26} />
      </h1>
      <div className="mt-1.5 text-sm">
        <Link href="/cart" className="underline underline-offset-2 opacity-60 hover:opacity-100">
          ← {t('backToCart')}
        </Link>
      </div>

      <form onSubmit={placeOrder} noValidate className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          {/* 1 — address */}
          <section className="rounded-[var(--r-card)] bg-white p-5 b2 sh sm:p-6">
            <SecTitle n={1}>{t('hData')}</SecTitle>
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <Field id="co-name" testId="co-name" label={t('fName')} ph={t('phName')} value={name} err={show('name')} onChange={setName} span2 autoComplete="name" />
              <Field id="co-email" testId="email" label={t('fEmail')} ph={t('phEmail')} value={email} err={show('email')} onChange={setEmail} inputMode="email" autoComplete="email" />
              <div>
                <label className="mb-1 block text-[12px] font-bold uppercase tracking-wide opacity-60" htmlFor="co-phone">
                  {t('fPhone')}
                </label>
                <input
                  id="co-phone"
                  value={phone}
                  placeholder={t('phPhone')}
                  inputMode="tel"
                  autoComplete="tel"
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, '').slice(0, 16))}
                  className="w-full rounded-[12px] border-2 border-ink bg-white px-3.5 py-2.5 text-[15px]"
                />
              </div>
              <Field id="co-street" testId="co-street" label={t('fStreet')} ph={t('phStreet')} value={street} err={show('street')} onChange={setStreet} span2 autoComplete="street-address" />
              <Field id="co-zip" testId="co-zip" label={t('fZip')} ph={t('phZip')} value={zip} err={show('zip')} onChange={(v) => setZip(maskZip(v))} inputMode="numeric" autoComplete="postal-code" />
              <Field id="co-city" testId="co-city" label={t('fCity')} ph={t('phCity')} value={city} err={show('city')} onChange={setCity} autoComplete="address-level2" />
            </div>
          </section>

          {/* 2 — the one delivery option checkout charges */}
          <section className="rounded-[var(--r-card)] bg-white p-5 b2 sh sm:p-6">
            <SecTitle n={2}>{t('hShip')}</SecTitle>
            <div className="mt-4">
              <OptionCard
                name={t('shipKurier')}
                desc={t('shipKurierD')}
                right={<b className="font-display">{zl(SHIP_COURIER_PLN)}</b>}
                rot={-0.4}
              />
            </div>
          </section>

          {/* 3 — payment happens on Przelewy24's page */}
          <section className="rounded-[var(--r-card)] bg-white p-5 b2 sh sm:p-6">
            <SecTitle n={3}>{t('hPay')}</SecTitle>
            <div className="mt-4">
              <OptionCard name={t('payP24')} desc={t('payP24D')} right={null} rot={0.4} />
            </div>
            <PayMarks className="mt-3 flex flex-wrap items-center gap-1.5" />
          </section>

          {/* consents + the withdrawal notice, right where the money moves */}
          <section className="rounded-[var(--r-card)] bg-cream p-5 b2 sh sm:p-6">
            <label className="flex min-h-[44px] cursor-pointer items-start gap-3 py-1 scroll-mt-[132px]" htmlFor="c-terms">
              <span className="relative mt-0.5 inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg border-[2.5px] border-ink shs" style={consentBox(terms)}>
                {terms && <CheckIcon s={15} />}
                <input id="c-terms" data-testid="c-terms" type="checkbox" checked={terms} onChange={() => setTerms(!terms)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </span>
              <span className="text-sm leading-relaxed">
                {t('cTermsA')}
                <Link href="/info/regulamin" className="underline underline-offset-2" target="_blank">
                  {t('cTermsB')}
                </Link>
                <span className="text-pink"> *</span>
              </span>
            </label>
            <label className="flex min-h-[44px] cursor-pointer items-start gap-3 py-1 scroll-mt-[132px]" htmlFor="c-priv">
              <span className="relative mt-0.5 inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg border-[2.5px] border-ink shs" style={consentBox(priv)}>
                {priv && <CheckIcon s={15} />}
                <input id="c-priv" data-testid="c-priv" type="checkbox" checked={priv} onChange={() => setPriv(!priv)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </span>
              <span className="text-sm leading-relaxed">
                {t('cPrivA')}
                <Link href="/info/privacy" className="underline underline-offset-2" target="_blank">
                  {t('cPrivB')}
                </Link>
                <span className="text-pink"> *</span>
              </span>
            </label>

            <div className="mt-4 rounded-[16px] border-2 border-ink bg-white p-4" data-testid="withdrawal-notice">
              <h3 className="m-0 mb-1.5 font-display text-[15px] font-extrabold">{t('legalH')}</h3>
              <p className="m-0 text-sm leading-relaxed">
                <b>{t('legalB1')}</b>
                {t('legalP1')}
              </p>
              <p className="m-0 mt-2 text-sm leading-relaxed">
                <b>{t('legalB2')}</b>
                {t('legalP2')}
              </p>
            </div>

            {tried && !consentsOk && (
              <p className="m-0 mt-3 text-sm font-semibold text-pink">{t('consentHint')}</p>
            )}
            {error && <p className="m-0 mt-3 rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-900">{t('error')}</p>}

            <button type="submit" disabled={placing} data-testid="place-order" className="btn-p mt-4 w-full text-[16px] disabled:opacity-60">
              {placing ? '…' : t('payCta')}
              <ArrowR />
            </button>
          </section>
        </div>

        {/* summary aside */}
        <aside className="rounded-[var(--r-card)] bg-cream p-5 b2 sh lg:sticky lg:top-[120px]">
          <h2 className="m-0 flex items-center gap-2 font-display text-lg font-extrabold">
            {t('sumH')}
            <Sparkle s={16} />
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {cart.items.map((it) => (
              <div key={it.id} className="flex items-center gap-3">
                <div className="shrink-0">
                  <ItemThumb pose={it.pose} thumbnail={it.thumbnail} size="xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-sm font-bold leading-tight">
                    {it.designId ? tc('prodName') : it.title}
                  </div>
                  <div className="mt-0.5 text-xs opacity-60">{itemMeta(tc, it)}</div>
                  <div className="text-xs opacity-60">
                    {it.quantity} × {zl(it.unitPrice)}
                  </div>
                </div>
                <b className="shrink-0 font-display text-sm">{zl(it.total)}</b>
              </div>
            ))}
          </div>
          <div className="my-4" style={{ borderTop: '2px dashed rgba(23,19,26,.25)' }} />
          <div className="flex flex-col gap-2 text-[14px]">
            <div className="flex justify-between gap-3">
              <span>{t('sumSub')}</span>
              <b className="font-display">{zl(subtotal)}</b>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>
                {t('sumShip')}
                <span className="block text-xs opacity-55">{t('shipKurier')}</span>
              </span>
              <b className="font-display">{zl(ship)}</b>
            </div>
          </div>
          <div className="my-3" style={{ borderTop: '2px dashed rgba(23,19,26,.25)' }} />
          <div className="flex items-end justify-between gap-3">
            <span className="font-display font-bold">{t('sumTotal')}</span>
            <span className="font-display text-2xl font-extrabold" data-testid="co-total">
              {zl(total)}
            </span>
          </div>
          {delivery && (
            <div className="mt-4">
              <DeliveryRow label={tc('delLbl')} from={delivery.from} to={delivery.to} locale={locale} />
            </div>
          )}
        </aside>
      </form>
    </main>
  );
}

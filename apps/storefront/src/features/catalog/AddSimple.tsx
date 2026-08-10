'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowR, CheckIcon, IconMinusSm, IconPlusSm } from '@/components/icons';

const zl = (grosz: number) =>
  (grosz % 100 === 0 ? String(grosz / 100) : (grosz / 100).toFixed(2).replace('.', ',')) + ' zł';

/**
 * Quantity + add-to-cart for an ordinary catalogue product. Joins the same cart the
 * constructor uses (gl_cart_id), so figurines and plain goods check out together.
 */
export function AddSimple({
  variantId,
  unitGrosz,
  addLabel,
  qtyLabel,
}: {
  variantId: string;
  unitGrosz: number;
  addLabel: string;
  qtyLabel: string;
}) {
  const t = useTranslations('cart');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(false);

  const add = async () => {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch('/api/gl/cart-simple', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          variantId,
          quantity: qty,
          cartId: localStorage.getItem('gl_cart_id') ?? undefined,
        }),
      });
      if (!res.ok) throw new Error('add failed');
      const body = (await res.json()) as { cartId: string };
      localStorage.setItem('gl_cart_id', body.cartId);
      setAdded(true);
      window.setTimeout(() => setAdded(false), 6000);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="m-0 mb-1.5 text-[12px] font-semibold uppercase tracking-wide opacity-55">{qtyLabel}</p>
          <div className="inline-flex items-center rounded-[14px] border-2 border-ink bg-white shs">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="px-3 py-2"
              aria-label="−"
              data-testid="sp-minus"
            >
              <IconMinusSm />
            </button>
            <span className="min-w-[2.2rem] text-center font-display text-lg font-extrabold" data-testid="sp-qty">
              {qty}
            </span>
            <button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} className="px-3 py-2" aria-label="+" data-testid="sp-plus">
              <IconPlusSm />
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={busy}
          className="btn-p mt-5 flex-1 whitespace-nowrap px-6 text-[15.5px] disabled:opacity-60 sm:flex-none"
          data-testid="sp-add"
        >
          {busy ? '…' : `${addLabel} · ${zl(unitGrosz * qty)}`}
        </button>
      </div>

      {added && (
        <div
          className="mt-4 flex items-center gap-3 rounded-[14px] p-3.5 text-white b2 sh"
          style={{ background: 'var(--ink)' }}
          data-testid="sp-added"
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--lime)' }}>
            <CheckIcon s={15} />
          </span>
          <Link href="/cart" className="font-semibold text-white underline underline-offset-2">
            {t('checkout')}
            <ArrowR s={15} />
          </Link>
        </div>
      )}
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{t('loading')}</p>}
    </div>
  );
}

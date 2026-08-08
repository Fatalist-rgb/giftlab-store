'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';

type Phase = 'working' | 'pending' | 'missing';

/**
 * Where the customer lands after paying on the provider's page. The order is created
 * here — but only once the provider's webhook has authorised the payment, so we retry
 * for a few seconds. If the confirmation is still not in, we say so honestly instead of
 * claiming failure: the money may well be on its way and the order will be confirmed by
 * e-mail as soon as the notification arrives.
 */
export function CheckoutReturn() {
  const t = useTranslations('checkoutReturn');
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('working');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const cartId = localStorage.getItem('gl_cart_id');
    if (!cartId) {
      setPhase('missing');
      return;
    }

    let cancelled = false;
    const attempt = async (left: number): Promise<void> => {
      if (cancelled) return;
      const res = await fetch('/api/gl/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cartId }),
      }).catch(() => null);

      if (res?.ok) {
        const body = (await res.json()) as { orderId: string };
        localStorage.removeItem('gl_cart_id');
        router.replace(`/order/${body.orderId}`);
        return;
      }
      if (left <= 0) {
        setPhase('pending');
        return;
      }
      setTimeout(() => void attempt(left - 1), 2000);
    };

    void attempt(6); // ~12 s of grace for the provider notification
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto max-w-xl px-5 py-20 text-center">
      {phase === 'working' && (
        <>
          <h1 className="font-display text-2xl font-extrabold">{t('working')}</h1>
          <p className="mt-3 opacity-70">{t('workingSub')}</p>
        </>
      )}
      {phase === 'pending' && (
        <>
          <h1 className="font-display text-2xl font-extrabold">{t('pending')}</h1>
          <p className="mt-3 opacity-70">{t('pendingSub')}</p>
        </>
      )}
      {phase === 'missing' && (
        <>
          <h1 className="font-display text-2xl font-extrabold">{t('missing')}</h1>
          <p className="mt-3 opacity-70">{t('missingSub')}</p>
        </>
      )}
      <Link
        href="/"
        className="mt-6 inline-block btn-s px-4 py-2 text-[14px]"
      >
        {t('home')}
      </Link>
    </main>
  );
}

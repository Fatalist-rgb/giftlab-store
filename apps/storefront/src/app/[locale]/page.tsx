import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Guarantee } from '@/components/Guarantee';
import { Reviews } from '@/features/reviews/Reviews';

/**
 * The landing. Placeholder artwork stands in until the client's photos arrive; the
 * structure (hero → how it works → ladder → guarantee → reviews → FAQ → CTA) is final.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  const steps = ['s1', 's2', 's3'] as const;
  const faqs = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
  const tiers = [
    { qty: '1–2', price: '79 zł' },
    { qty: '3–5', price: '65 zł', hot: true },
    { qty: '6+', price: '49 zł' },
  ];

  return (
    <main>
      {/* hero */}
      <section className="mx-auto max-w-4xl px-5 pb-14 pt-16 text-center">
        <span className="inline-block rounded-full border-2 border-ink bg-lime px-3 py-1 text-sm font-bold shadow-offset-sm">
          {t('badge')}
        </span>
        <h1 className="mx-auto mt-5 max-w-2xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">
          {t('title')}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg opacity-75">{t('sub')}</p>
        <Link
          href="/product"
          className="mt-8 inline-block rounded-2xl border-2 border-ink bg-mandarin px-8 py-3.5 font-display text-lg font-bold text-white shadow-offset transition-transform hover:-translate-y-0.5"
        >
          {t('cta')}
        </Link>
        <div className="mt-10 flex items-end justify-center gap-4" aria-hidden>
          {['blue', 'pink', 'green'].map((c, i) => (
            <Image
              key={c}
              src={`/art/body-${c}.png`}
              alt=""
              width={128}
              height={178}
              className={`w-24 rounded-2xl border-2 border-ink bg-white p-2 shadow-offset-sm sm:w-32 ${i === 1 ? '-translate-y-3' : ''}`}
            />
          ))}
        </div>
        <p className="mt-3 text-xs opacity-45">{t('artNote')}</p>
      </section>

      {/* how it works */}
      <section className="border-y-2 border-ink bg-cream">
        <div className="mx-auto max-w-4xl px-5 py-12">
          <h2 className="text-center font-display text-2xl font-extrabold">{t('howTitle')}</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s} className="rounded-2xl border-2 border-ink bg-white p-5 shadow-offset-sm">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-lime font-display font-extrabold">
                  {i + 1}
                </span>
                <p className="mt-3 font-display font-bold">{t(`${s}Title`)}</p>
                <p className="mt-1 text-sm opacity-70">{t(`${s}Body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* price ladder */}
      <section className="mx-auto max-w-4xl px-5 py-12">
        <h2 className="text-center font-display text-2xl font-extrabold">{t('priceTitle')}</h2>
        <p className="mt-2 text-center text-sm opacity-60">{t('priceSub')}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.qty}
              className={`rounded-2xl border-2 border-ink p-5 text-center shadow-offset-sm ${tier.hot ? 'bg-lime' : 'bg-white'}`}
            >
              <p className="text-sm font-bold opacity-60">{t('pieces', { qty: tier.qty })}</p>
              <p className="mt-1 font-display text-3xl font-extrabold">{tier.price}</p>
              <p className="text-xs opacity-55">{t('perPiece')}</p>
              {tier.hot && <p className="mt-2 text-xs font-bold">{t('popular')}</p>}
            </div>
          ))}
        </div>
        <div className="mx-auto mt-8 max-w-xl">
          <Guarantee />
        </div>
      </section>

      {/* reviews (live from the backend) */}
      <Reviews />

      {/* FAQ */}
      <section className="border-t-2 border-ink bg-cream">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <h2 className="text-center font-display text-2xl font-extrabold">{t('faqTitle')}</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((q) => (
              <details key={q} className="group rounded-2xl border-2 border-ink bg-white p-4 shadow-offset-sm">
                <summary className="cursor-pointer list-none font-display font-bold">
                  {t(`${q}Q`)}
                  <span className="float-right transition-transform group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed opacity-75">{t(`${q}A`)}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/product"
              className="inline-block rounded-2xl border-2 border-ink bg-mandarin px-8 py-3.5 font-display text-lg font-bold text-white shadow-offset"
            >
              {t('cta')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

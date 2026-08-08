import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Guarantee } from '@/components/Guarantee';
import { Reviews } from '@/features/reviews/Reviews';

/**
 * The landing, rebuilt on the design the client approved on the demo.
 *
 * Two things drive the layout. The hero sells the OBJECT — a photo of the finished
 * magnet beside copy that lists what arrives in the parcel — because a visitor who
 * cannot picture the product does not care that there is a builder behind it. And
 * every section is the same card: 2.5px ink border, hard offset shadow, cream bands
 * to separate them. No gradients, no blur; the whole shop is that one recipe.
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
  const real = [
    { k: 'r1', src: '/photos/real-faces.webp' },
    { k: 'r2', src: '/photos/real-belly.webp' },
    { k: 'r3', src: '/photos/real-door.webp' },
  ] as const;

  return (
    <main>
      {/* ---- hero: copy left, the real product right ---- */}
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 pt-9 lg:grid-cols-[1fr_1.04fr] lg:gap-10 lg:pb-16 lg:pt-14">
        <div>
          <span className="stkr bg-lime text-[13px]" style={{ transform: 'rotate(-1.5deg)' }}>
            {t('badge')}
          </span>
          <h1 className="mt-5 font-display text-[38px] font-extrabold leading-[1.04] sm:text-[50px] lg:text-[54px]">
            {t('title')}
          </h1>
          <p className="mt-5 max-w-[48ch] text-[16.5px] opacity-80 sm:text-[17.5px]">{t('sub')}</p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <span className="stkr bg-white text-[13px]">
              <b className="font-display">{t('rating')}</b>
            </span>
            <span className="stkr bg-white text-[13px] font-semibold">{t('reviewsN')}</span>
            <span className="stkr bg-white text-[13px] font-semibold">{t('ship48')}</span>
          </div>

          <Link href="/product" className="btn-p mt-7 px-7 text-[16px]" data-testid="hero-cta">
            {t('cta')} →
          </Link>
        </div>

        <figure className="relative m-0">
          <div className="card p-2.5" style={{ transform: 'rotate(-1.1deg)' }}>
            <Image
              src="/photos/real-hero.webp"
              alt={t('heroAlt')}
              width={950}
              height={650}
              priority
              sizes="(max-width: 1024px) 100vw, 560px"
              className="block h-auto w-full rounded-[14px] border-2 border-ink bg-cream"
            />
          </div>
          <figcaption className="mt-2.5 px-1 text-[12px] leading-snug opacity-60">
            {t('heroCap')}
          </figcaption>
        </figure>
      </section>

      {/* the ticker: pure decoration, and it stops for reduced motion */}
      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[0, 1].map((i) => (
            <span key={i} className="whitespace-nowrap px-6 py-2.5 font-display text-[13px] font-extrabold uppercase tracking-wider text-white">
              {t('marquee')} ·&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ---- the finished thing, photographed ---- */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-center font-display text-[26px] font-extrabold sm:text-[32px]">
          {t('realTitle')}
        </h2>
        <p className="mx-auto mt-2 max-w-[60ch] text-center text-[15px] opacity-70">{t('realSub')}</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {real.map((r, i) => (
            <figure key={r.k} className="card m-0 overflow-hidden" style={{ transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }}>
              <Image
                src={r.src}
                alt={t(`${r.k}d`)}
                width={600}
                height={600}
                sizes="(max-width: 640px) 100vw, 360px"
                className="aspect-square w-full border-b-2 border-ink object-cover"
              />
              <figcaption className="p-4">
                <p className="font-display text-[15.5px] font-bold leading-tight">{t(r.k)}</p>
                <p className="mt-1 text-[13px] leading-snug opacity-70">{t(`${r.k}d`)}</p>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-3 text-center text-xs opacity-45">{t('photoNote')}</p>
      </section>

      {/* ---- how it works ---- */}
      <section className="border-y-2 border-ink bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-center font-display text-[26px] font-extrabold sm:text-[32px]">
            {t('howTitle')}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s} className="card p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-lime font-display font-extrabold">
                  {i + 1}
                </span>
                <p className="mt-3 font-display text-[16px] font-bold">{t(`${s}Title`)}</p>
                <p className="mt-1 text-[14px] leading-snug opacity-70">{t(`${s}Body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- price ladder: quantity is the only lever ---- */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-center font-display text-[26px] font-extrabold sm:text-[32px]">
          {t('priceTitle')}
        </h2>
        <p className="mt-2 text-center text-[14px] opacity-60">{t('priceSub')}</p>
        <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.qty}
              className={`card p-5 text-center ${tier.hot ? '!bg-lime' : ''}`}
              style={tier.hot ? { transform: 'rotate(-1deg)' } : undefined}
            >
              <p className="text-[13px] font-bold opacity-60">{t('pieces', { qty: tier.qty })}</p>
              <p className="mt-1 font-display text-[30px] font-extrabold">{tier.price}</p>
              <p className="text-xs opacity-55">{t('perPiece')}</p>
              {tier.hot && <p className="mt-2 text-xs font-bold">{t('popular')}</p>}
            </div>
          ))}
        </div>
        <div className="mx-auto mt-8 max-w-xl">
          <Guarantee />
        </div>
      </section>

      <Reviews />

      {/* ---- FAQ + the closing CTA ---- */}
      <section className="border-t-2 border-ink bg-cream">
        <div className="mx-auto max-w-2xl px-4 py-12">
          <h2 className="text-center font-display text-[26px] font-extrabold sm:text-[32px]">
            {t('faqTitle')}
          </h2>
          <div className="mt-6 space-y-3">
            {faqs.map((q) => (
              <details key={q} className="group card p-4">
                <summary className="cursor-pointer list-none font-display font-bold">
                  {t(`${q}Q`)}
                  <span className="float-right transition-transform group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed opacity-75">{t(`${q}A`)}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/product" className="btn-p px-8 text-[17px]">
              {t('cta')} →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

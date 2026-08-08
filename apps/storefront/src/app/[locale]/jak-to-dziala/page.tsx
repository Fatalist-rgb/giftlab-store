import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Accordion } from '@/components/Accordion';
import { ArrowR, Burst, IcoBox, IcoChar, IcoCut, IcoName, SecHead } from '@/components/icons';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages' });
  return {
    title: t('jakTitle'),
    description: t('jakLead'),
    alternates: {
      canonical: `/${locale}/jak-to-dziala`,
      languages: {
        pl: '/pl/jak-to-dziala',
        en: '/en/jak-to-dziala',
        uk: '/uk/jak-to-dziala',
        'x-default': '/pl/jak-to-dziala',
      },
    },
  };
}

/**
 * The long version of the four steps the landing summarises.
 *
 * It exists for the visitor who is not ready to open the builder yet: the same four
 * cards, then the photo guide that decides whether their upload will work, then the
 * objections. Every string is shared with the landing, so the two can never tell a
 * different story about how the product is made.
 */
export default async function HowItWorks({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages');
  const h = await getTranslations('home');
  const p = await getTranslations('product');

  const steps = [IcoChar, IcoCut, IcoName, IcoBox];
  const rot = [-2.2, 1.6, -1.4, 2.2];
  const bg = ['var(--lime)', '#fff', '#fff', 'var(--lime)'];
  const faqs = [1, 2, 3, 4, 5].map((i) => ({ q: h(`q${i}Q`), a: h(`q${i}A`) }));

  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:pt-14">
        <SecHead title={t('jakTitle')} sub={t('jakLead')} />
        <div className="mt-5 flex justify-center">
          <span className="stkr bg-lime text-[12px]" style={{ transform: 'rotate(-1.5deg)' }}>
            <Burst s={12} c="var(--ink)" />
            {h('ship48')}
          </span>
        </div>

        <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((I, i) => (
            <div key={i} className="rv" style={{ '--d': `${0.06 * i}s` } as React.CSSProperties}>
              <div className="relative h-full rounded-[var(--r-card)] bg-white p-5 b2 sh" style={{ transform: `rotate(${rot[i]}deg)` }}>
                <div className="flex h-14 w-14 items-center justify-center rounded-[14px] border-2 border-ink shs" style={{ background: bg[i] }}>
                  <I />
                </div>
                <span className="absolute right-5 top-4 font-display text-[13px] font-extrabold opacity-30">0{i + 1}</span>
                <h2 className="mt-4 font-display text-[18px] font-bold leading-tight">{h(`s${i + 1}Title`)}</h2>
                <p className="mt-2 text-[14.5px] leading-snug opacity-70">{h(`s${i + 1}Body`)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* the photo guide: shown here as well as in the builder, because the choice of
          photo is made before anyone opens the builder */}
      <section className="bg-cream" style={{ borderTop: 'var(--border)', borderBottom: 'var(--border)' }}>
        <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
          <SecHead title={t('jakPhotoTitle')} sub={t('jakPhotoSub')} />
          <figure className="m-0 mt-9 rounded-[var(--r-card)] bg-white p-3 b2 sh">
            <Image
              src="/photos/photo-guide.webp"
              alt={p('guideAlt')}
              width={900}
              height={900}
              sizes="(max-width: 768px) 100vw, 720px"
              className="block h-auto w-full rounded-[14px] border-2 border-ink bg-white"
            />
          </figure>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <SecHead title={t('jakFaqTitle')} />
        <Accordion items={faqs} idPrefix="jak-faq" />
        <div className="mt-11 text-center">
          <Link href="/product" className="btn-p px-7 text-[16px]">
            {h('cta')}
            <ArrowR />
          </Link>
        </div>
      </section>
    </main>
  );
}

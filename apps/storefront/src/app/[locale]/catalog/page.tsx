import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PoseCard } from '@/components/PoseCard';
import { Sparkle } from '@/components/icons';
import { POSES } from '@/lib/poses';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'catalog' });
  return {
    title: t('title'),
    description: t('sub'),
    alternates: {
      canonical: `/${locale}/catalog`,
      languages: { pl: '/pl/catalog', en: '/en/catalog', uk: '/uk/catalog', 'x-default': '/pl/catalog' },
    },
  };
}

/**
 * The catalogue: one REAL category — the six belly-figurine poses, each card a door
 * into the builder. The "wkrótce" teasers (pets, holidays) were dropped on request:
 * nothing sellable stands behind them yet, so the page shows only what exists. It
 * stays static because listing the backend's placeholder products as buyable was
 * the thing the design retired.
 */
export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('catalog');
  const tCart = await getTranslations('cart');

  const rot = [-1.6, 1.4, -1.2, 1.8];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="m-0 flex items-center gap-3 font-display text-3xl font-extrabold sm:text-4xl">
        {t('title')}
        <Sparkle s={26} />
      </h1>
      <p className="mb-0 mt-2 max-w-xl opacity-70">{t('sub')}</p>

      {/* the real category: six poses, straight into the builder */}
      <h2 className="mb-4 mt-9 font-display text-2xl font-extrabold">{t('belly')}</h2>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
        {POSES.map((p, i) => (
          <PoseCard
            key={p.id}
            pose={p}
            index={i}
            rotate={rot[i % rot.length]!}
            name={tCart(`pose.${p.id}`)}
            note={t('cardNote')}
            price="79 zł"
            testId={`kat-${p.id}`}
          />
        ))}
      </div>

    </main>
  );
}

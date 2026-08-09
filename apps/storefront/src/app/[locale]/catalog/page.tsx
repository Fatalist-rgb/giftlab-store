import type { Metadata } from 'next';
import Image from 'next/image';
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
 * The catalogue, as approved on the demo: one REAL category — the six belly-figurine
 * poses, each card a door into the builder — and two honest "wkrótce" ones (pets,
 * holidays) with placeholder artwork. They show where the shop grows next without
 * pretending it sells that today, which is also why this page is static now: listing
 * the backend's placeholder products as buyable was the thing the design retired.
 */
export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('catalog');
  const tCart = await getTranslations('cart');

  const rot = [-1.6, 1.4, -1.2, 1.8];
  const soonCats = [
    { h: t('pets'), d: t('petsD'), art: ['/art/pet-dog.png', '/art/pet-cat.png', '/art/pet-rabbit.png'] },
    { h: t('xmas'), d: t('xmasD'), art: ['/art/xmas-santa.png', '/art/xmas-elf.png', '/art/xmas-reindeer.png'] },
  ];

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

      {/* what grows next — marked "wkrótce", never pretending to be buyable */}
      {soonCats.map((c) => (
        <section key={c.h}>
          <h2 className="mb-1.5 mt-11 flex items-center gap-3 font-display text-2xl font-extrabold">
            {c.h}
            <span className="stkr bg-pink text-[11px] text-white" style={{ transform: 'rotate(-2deg)' }}>
              {t('soon')}
            </span>
          </h2>
          <p className="mb-4 mt-0 max-w-xl opacity-70">{c.d}</p>
          <div className="grid grid-cols-3 gap-4 sm:gap-5">
            {c.art.map((src, i) => (
              <div key={src} className="rounded-[var(--r-card)] bg-white p-3 b2 sh" style={{ opacity: 0.85, transform: `rotate(${rot[(i + 1) % rot.length]}deg)` }}>
                <div className="flex items-center justify-center rounded-[14px] border-2 border-ink bg-cream p-3" style={{ height: 150 }}>
                  <Image src={src} alt="" width={200} height={280} className="h-auto max-h-[88%] w-auto max-w-[70%]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      <p className="mb-0 mt-6 text-[12px] opacity-50">{t('soonNote')}</p>
    </main>
  );
}

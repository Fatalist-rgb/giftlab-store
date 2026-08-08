import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { fetchCatalog } from '@/lib/backend';

// ISR — the catalogue is prebuilt and refreshed every 5 minutes
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: 'Katalog figurek',
    description: 'Personalizowane figurki akrylowe: mama, dzieci, zwierzaki, święta. 11 cm, magnes w zestawie.',
    alternates: {
      canonical: `/${locale}/catalog`,
      languages: { pl: '/pl/catalog', en: '/en/catalog', uk: '/uk/catalog', 'x-default': '/pl/catalog' },
    },
  };
}

const zl = (grosz: number) => (grosz % 100 === 0 ? String(grosz / 100) : (grosz / 100).toFixed(2));

// the flagship keeps its dedicated route; every other product gets the dynamic one
const productHref = (locale: string, handle: string | null) =>
  handle === 'figurka-z-brzuszkiem' ? `/${locale}/product` : `/${locale}/product/${handle}`;

export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('catalog');

  const categories = await fetchCatalog();

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{t('title')}</h1>

      {categories.length === 0 ? (
        <p className="mt-6 opacity-70">{t('empty')}</p>
      ) : (
        categories.map((cat) => (
          <section key={cat.id} className="mt-10">
            <h2 className="font-display text-2xl font-bold">{cat.name}</h2>
            {cat.description ? <p className="mt-1 text-sm opacity-70">{cat.description}</p> : null}
            <ul className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cat.products.map((p) => {
                const bulk = p.ladder.length ? p.ladder[p.ladder.length - 1] : null;
                return (
                  <li
                    key={p.id}
                    className="card p-4 transition-transform hover:-translate-y-0.5"
                  >
                    <Link
                      href={productHref(locale, p.handle)}
                      className="block"
                      data-testid={`catalog-item-${p.handle}`}
                    >
                      {p.thumbnail ? (
                        <div className="mb-3 flex aspect-[4/3] w-full items-center justify-center rounded-[14px] border-2 border-ink bg-white">
                          {/* schema artwork: served from /public locally and R2 in prod (same key) */}
                          <img src={p.thumbnail} alt="" className="h-full w-auto object-contain py-3" />
                        </div>
                      ) : (
                        <div className="mb-3 flex aspect-[4/3] w-full items-center justify-center rounded-[14px] border-2 border-ink bg-cream text-4xl">
                          🎁
                        </div>
                      )}
                      <h3 className="font-display text-lg font-bold">{p.title}</h3>
                      {p.description ? (
                        <p className="mt-1 line-clamp-2 text-sm opacity-70">{p.description}</p>
                      ) : null}
                      <div className="mt-3 flex items-baseline gap-2">
                        {p.basePriceGrosz != null ? (
                          <span className="font-display text-xl font-extrabold">{zl(p.basePriceGrosz)} zł</span>
                        ) : null}
                        {bulk && bulk.minQty > 1 ? (
                          <span className="rounded-full bg-lime px-2 py-0.5 text-xs font-bold">
                            {t('ladderHint', { price: zl(bulk.unitPrice), qty: bulk.minQty })}
                          </span>
                        ) : null}
                      </div>
                      {p.variantCount > 1 ? (
                        <p className="mt-1 text-xs opacity-60">{t('variants', { count: p.variantCount })}</p>
                      ) : null}
                      <span className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
                        {t('customize')} →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}

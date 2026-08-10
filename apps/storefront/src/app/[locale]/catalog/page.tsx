import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
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

type CatalogItem = {
  id: string;
  handle: string | null;
  title: string;
  description: string | null;
  kind: 'constructor' | 'simple';
  basePriceGrosz: number | null;
  ladder: Array<{ minQty: number; unitPrice: number }>;
  thumbnail: string | null;
};
type CatalogCategory = { id: string; name: string; description: string | null; products: CatalogItem[] };

const FLAGSHIP_HANDLE = 'figurka-z-brzuszkiem';

/** Admin-managed categories, refreshed every 5 minutes. A failure returns an empty
 *  list — the flagship section always renders, so the page never breaks. */
async function fetchCatalog(): Promise<CatalogCategory[]> {
  const base = process.env.MEDUSA_BACKEND_URL;
  const key = process.env.MEDUSA_PUBLISHABLE_KEY;
  if (!base || !key) return [];
  try {
    const res = await fetch(`${base}/store/gl/catalog`, {
      headers: { 'x-publishable-api-key': key },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { categories: CatalogCategory[] };
    return body.categories ?? [];
  } catch {
    return [];
  }
}

const zl = (grosz: number) =>
  (grosz % 100 === 0 ? String(grosz / 100) : (grosz / 100).toFixed(2).replace('.', ',')) + ' zł';

/**
 * The catalogue: the six belly-figurine poses first (each card a door into the
 * builder), then every admin-managed category with published products — priced
 * goods added in the Medusa admin appear here without a deploy. A product with a
 * constructor schema opens the builder; an ordinary one opens its product page.
 */
export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('catalog');
  const tCart = await getTranslations('cart');
  const categories = await fetchCatalog();

  const rot = [-1.6, 1.4, -1.2, 1.8];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="m-0 flex items-center gap-3 font-display text-3xl font-extrabold sm:text-4xl">
        {t('title')}
        <Sparkle s={26} />
      </h1>
      <p className="mb-0 mt-2 max-w-xl opacity-70">{t('sub')}</p>

      {/* the flagship: six poses, straight into the builder */}
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

      {/* admin-managed categories; the flagship is filtered out — it owns the section above */}
      {categories.map((cat) => {
        const items = cat.products.filter((p) => p.handle !== FLAGSHIP_HANDLE);
        if (!items.length) return null;
        return (
          <section key={cat.id} data-testid={`kat-cat-${cat.id}`}>
            <h2 className="mb-1.5 mt-11 font-display text-2xl font-extrabold">{cat.name}</h2>
            {cat.description && <p className="mb-4 mt-0 max-w-xl opacity-70">{cat.description}</p>}
            <div className="mt-4 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
              {items.map((p, i) => {
                const href = p.kind === 'constructor' ? '/product' : `/p/${p.handle ?? p.id}`;
                const minLadder = p.ladder.length
                  ? Math.min(...p.ladder.map((l) => l.unitPrice))
                  : null;
                return (
                  <Link
                    key={p.id}
                    href={href}
                    className="block rounded-[var(--r-card)] bg-white p-3 no-underline b2 sh transition-transform hover:-translate-y-1 sm:p-4"
                    style={{ color: 'var(--ink)', transform: `rotate(${rot[i % rot.length]}deg)` }}
                    data-testid={`kat-item-${p.handle ?? p.id}`}
                  >
                    <div className="flex items-center justify-center overflow-hidden rounded-[14px] border-2 border-ink bg-cream" style={{ height: 210 }}>
                      {p.thumbnail ? (
                         
                        <img src={p.thumbnail} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <Sparkle s={34} />
                      )}
                    </div>
                    <h3 className="m-0 mt-3 font-display text-[15.5px] font-bold leading-tight sm:text-[17px]">{p.title}</h3>
                    {p.description && (
                      <p className="mb-0 mt-0.5 truncate text-[12.5px] leading-snug opacity-65">{p.description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between pt-2.5" style={{ borderTop: '2px dashed rgba(23,19,26,.18)' }}>
                      <span className="font-display text-[15px] font-extrabold">
                        {p.basePriceGrosz != null
                          ? minLadder != null && minLadder < p.basePriceGrosz
                            ? `${t('from')} ${zl(minLadder)}`
                            : zl(p.basePriceGrosz)
                          : ''}
                      </span>
                      <span className="stkr bg-lime text-[11px]">{t('cardCta')}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}

import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { fetchCatalog } from '@/lib/backend';

// ISR — the catalogue is prebuilt and refreshed every 5 minutes
export const revalidate = 300;

export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('catalog');

  const products = await fetchCatalog();

  return (
    <main className="mx-auto max-w-5xl px-5 py-16">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{t('title')}</h1>

      {products.length === 0 ? (
        <p className="mt-6 opacity-70">{t('empty')}</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="rounded-2xl border border-black/10 p-5 transition hover:shadow-md">
              <Link href={`/${locale}/product`} className="block">
                {p.thumbnail ? (
                  // plain <img>: catalogue thumbnails come from Medusa with unknown domains
                  <img src={p.thumbnail} alt="" className="mb-4 aspect-[4/3] w-full rounded-xl object-cover" />
                ) : (
                  <div className="mb-4 flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-black/5 text-4xl">
                    🎁
                  </div>
                )}
                <h2 className="font-display text-lg font-bold">{p.title}</h2>
                {p.description ? (
                  <p className="mt-1 line-clamp-2 text-sm opacity-70">{p.description}</p>
                ) : null}
                <span className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
                  {t('customize')} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

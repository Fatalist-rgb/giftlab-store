import { setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { Constructor } from '@/features/constructor/Constructor';
import { Reviews } from '@/features/reviews/Reviews';
import { Guarantee } from '@/components/Guarantee';
import { fetchCatalog, fetchProductSchema } from '@/lib/backend';

// ISR — each catalogue product page is built on demand and refreshed every 5 minutes
export const revalidate = 300;

async function catalogEntry(handle: string) {
  const categories = await fetchCatalog();
  for (const cat of categories) {
    const hit = cat.products.find((p) => p.handle === handle);
    if (hit) return hit;
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale, handle } = await params;
  const entry = await catalogEntry(handle);
  return {
    title: entry ? `${entry.title} — zaprojektuj swoją` : 'Figurka — GiftLab',
    description:
      entry?.description ??
      'Wgraj zdjęcie, wybierz postać, dodaj imię. Podgląd na żywo — drukujemy dokładnie to, co widzisz.',
    alternates: {
      canonical: `/${locale}/product/${handle}`,
      languages: {
        pl: `/pl/product/${handle}`,
        en: `/en/product/${handle}`,
        uk: `/uk/product/${handle}`,
        'x-default': `/pl/product/${handle}`,
      },
    },
  };
}

export default async function CatalogProductPage({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale, handle } = await params;
  setRequestLocale(locale);

  // the flagship's canonical page stays /product — one URL, one set of links
  if (handle === 'figurka-z-brzuszkiem') redirect(`/${locale}/product`);

  // a catalogue page only exists for a product with a published schema
  const schema = await fetchProductSchema(handle);
  if (!schema) notFound();

  return (
    <>
      <Constructor schema={schema} productId={handle} />
      <div className="mx-auto max-w-2xl px-5 pt-2">
        <Guarantee />
      </div>
      <Reviews />
    </>
  );
}

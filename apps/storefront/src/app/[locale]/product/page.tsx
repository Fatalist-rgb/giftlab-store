import { setRequestLocale } from 'next-intl/server';
import { Constructor } from '@/features/constructor/Constructor';
import { Reviews } from '@/features/reviews/Reviews';
import { Guarantee } from '@/components/Guarantee';
import { fetchProductSchema, FIGURINE_PRODUCT_ID } from '@/lib/backend';

// ISR — the page is prebuilt with the live schema and refreshed every 5 minutes
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: 'Figurka z brzuszkiem — zaprojektuj swoją',
    description:
      'Wgraj zdjęcie, wybierz postać, dodaj imię. Podgląd na żywo — drukujemy dokładnie to, co widzisz. 79 zł, od 3 szt. taniej.',
    alternates: {
      canonical: `/${locale}/product`,
      languages: { pl: '/pl/product', en: '/en/product', uk: '/uk/product', 'x-default': '/pl/product' },
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // The constructor is data-driven: the published schema comes from Medusa when the
  // backend is configured, otherwise the local demo schema is used (see lib/backend.ts).
  const schema = await fetchProductSchema(FIGURINE_PRODUCT_ID);

  return (
    <>
      <Constructor schema={schema ?? undefined} />
      <div className="mx-auto max-w-2xl px-5 pt-2">
        <Guarantee />
      </div>
      <Reviews />
    </>
  );
}

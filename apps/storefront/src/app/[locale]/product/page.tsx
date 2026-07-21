import { setRequestLocale } from 'next-intl/server';
import { Constructor } from '@/features/constructor/Constructor';
import { Reviews } from '@/features/reviews/Reviews';
import { fetchProductSchema, FIGURINE_PRODUCT_ID } from '@/lib/backend';

// ISR — the page is prebuilt with the live schema and refreshed every 5 minutes
export const revalidate = 300;

export default async function ProductPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // The constructor is data-driven: the published schema comes from Medusa when the
  // backend is configured, otherwise the local demo schema is used (see lib/backend.ts).
  const schema = await fetchProductSchema(FIGURINE_PRODUCT_ID);

  return (
    <>
      <Constructor schema={schema ?? undefined} />
      <Reviews />
    </>
  );
}

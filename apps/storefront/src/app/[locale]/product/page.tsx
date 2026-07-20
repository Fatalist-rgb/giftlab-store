import { setRequestLocale } from 'next-intl/server';
import { Constructor } from '@/features/constructor/Constructor';
import { fetchProductSchema, FIGURINE_PRODUCT_ID } from '@/lib/backend';

export default async function ProductPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // The constructor is data-driven: the published schema comes from Medusa when the
  // backend is configured, otherwise the local demo schema is used (see lib/backend.ts).
  const schema = await fetchProductSchema(FIGURINE_PRODUCT_ID);

  return <Constructor schema={schema ?? undefined} />;
}

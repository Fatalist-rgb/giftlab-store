import { setRequestLocale } from 'next-intl/server';
import { Constructor } from '@/features/constructor/Constructor';

export default async function ProductPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Constructor />;
}

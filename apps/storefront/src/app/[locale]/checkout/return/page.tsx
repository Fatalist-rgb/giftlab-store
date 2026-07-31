import { setRequestLocale } from 'next-intl/server';
import { CheckoutReturn } from '@/features/cart/CheckoutReturn';

/** Landing page the payment provider sends the customer back to (urlReturn). */
export const dynamic = 'force-dynamic';

export default async function CheckoutReturnPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CheckoutReturn />;
}

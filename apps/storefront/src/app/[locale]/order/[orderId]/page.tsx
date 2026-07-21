import { setRequestLocale } from 'next-intl/server';
import { OrderStatus } from '@/features/order/OrderStatus';

export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  setRequestLocale(locale);
  return <OrderStatus orderId={orderId} />;
}

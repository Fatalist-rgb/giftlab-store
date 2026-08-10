import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Guarantee } from '@/components/Guarantee';
import { PayMarks } from '@/components/PayMarks';
import { Sparkle } from '@/components/icons';
import { AddSimple } from '@/features/catalog/AddSimple';

/**
 * The plain product page for admin-added goods: title, gallery, price-list price,
 * quantity, add to cart. The flagship figurine never lands here — it redirects to
 * the builder, which is its real product page.
 */

const FLAGSHIP_HANDLE = 'figurka-z-brzuszkiem';
const BASE = process.env.MEDUSA_BACKEND_URL;
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY;

type StoreProduct = {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  images?: Array<{ id: string; url: string }>;
  variants?: Array<{
    id: string;
    title: string | null;
    calculated_price?: { calculated_amount?: number | null } | null;
  }>;
};

async function fetchRegionId(): Promise<string | null> {
  if (!BASE || !KEY) return null;
  try {
    const res = await fetch(`${BASE}/store/regions`, {
      headers: { 'x-publishable-api-key': KEY },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { regions?: Array<{ id: string; currency_code: string }> };
    return body.regions?.find((r) => r.currency_code === 'pln')?.id ?? body.regions?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function fetchProduct(handle: string): Promise<StoreProduct | null> {
  if (!BASE || !KEY) return null;
  const regionId = await fetchRegionId();
  if (!regionId) return null;
  try {
    const qs = new URLSearchParams({
      handle,
      region_id: regionId,
      fields: 'id,handle,title,description,thumbnail,*images,*variants,*variants.calculated_price',
    });
    const res = await fetch(`${BASE}/store/products?${qs}`, {
      headers: { 'x-publishable-api-key': KEY },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { products?: StoreProduct[] };
    return body.products?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const product = await fetchProduct(handle);
  return { title: product?.title ?? 'Produkt', description: product?.description?.slice(0, 160) ?? undefined };
}

const zl = (grosz: number) =>
  (grosz % 100 === 0 ? String(grosz / 100) : (grosz / 100).toFixed(2).replace('.', ',')) + ' zł';

export default async function SimpleProductPage({ params }: { params: Promise<{ locale: string; handle: string }> }) {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  if (handle === FLAGSHIP_HANDLE) redirect(`/${locale}/product`);
  const t = await getTranslations('catalog');
  const tp = await getTranslations('product');

  const product = await fetchProduct(handle);
  const variant = product?.variants?.find((v) => typeof v.calculated_price?.calculated_amount === 'number');
  if (!product || !variant) notFound();
  const priceGrosz = Math.round((variant.calculated_price!.calculated_amount as number) * 100);
  const images = product.images?.length ? product.images : product.thumbnail ? [{ id: 'thumb', url: product.thumbnail }] : [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <div className="text-sm">
        <Link href="/catalog" className="underline underline-offset-2 opacity-70 hover:opacity-100">
          ← {t('backCat')}
        </Link>
      </div>

      <div className="mt-5 grid items-start gap-7 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        {/* gallery */}
        <div className="flex flex-col gap-3">
          {images.length ? (
            images.slice(0, 4).map((img, i) => (
              <div
                key={img.id}
                className="overflow-hidden rounded-[16px] border-2 border-ink bg-white shs"
                style={{ transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }}
              >
                { }
                <img src={img.url} alt={product.title} className="block h-auto w-full" loading={i ? 'lazy' : 'eager'} />
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center rounded-[16px] border-2 border-ink bg-cream" style={{ height: 320 }}>
              <Sparkle s={40} />
            </div>
          )}
        </div>

        {/* buy box */}
        <div className="lg:sticky lg:top-[120px]">
          <h1 className="m-0 font-display text-3xl font-extrabold leading-tight sm:text-4xl">{product.title}</h1>
          <p className="mt-3 font-display text-3xl font-extrabold">{zl(priceGrosz)}</p>
          {product.description && (
            <p className="mt-4 max-w-[52ch] whitespace-pre-wrap text-[15px] leading-relaxed opacity-80">{product.description}</p>
          )}
          <AddSimple variantId={variant.id} unitGrosz={priceGrosz} addLabel={tp('add')} qtyLabel={tp('qtyLab')} />
          <div className="mt-6">
            <PayMarks className="flex flex-wrap items-center gap-1.5" />
          </div>
          <div className="mt-6 border-t-2 border-dashed pt-5" style={{ borderColor: 'rgba(23,19,26,.2)' }}>
            <Guarantee compact />
          </div>
        </div>
      </div>
    </main>
  );
}

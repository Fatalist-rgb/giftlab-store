import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Guarantee } from '@/components/Guarantee';

/**
 * Upload-free ad entry page (T070): where paid traffic lands. No constructor, no photo
 * work on load — in-app browsers (FB/IG/TikTok) get a light, fast page; the constructor
 * opens only on the explicit CTA tap.
 */
export const metadata: Metadata = {
  title: 'Figurka z Twoją twarzą — od 49 zł/szt.',
  description: 'Wgraj zdjęcie, my zrobimy resztę. Podgląd przed produkcją, gotowe w 2-4 dni robocze.',
};

export default async function AdLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('ads');

  const points = ['preview', 'speed', 'magnet'] as const;

  return (
    <main className="mx-auto max-w-2xl px-5 py-14 text-center">
      <span className="inline-block rounded-full border-2 border-ink bg-lime px-3 py-1 text-sm font-bold shadow-offset-sm">
        {t('badge')}
      </span>
      <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight">{t('title')}</h1>
      <p className="mx-auto mt-4 max-w-lg text-lg opacity-75">{t('sub')}</p>

      <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-sm">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span aria-hidden className="text-mandarin">✓</span>
            <span className="opacity-80">{t(p)}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/product"
        className="mt-8 inline-block rounded-2xl border-2 border-ink bg-mandarin px-8 py-3.5 font-display text-lg font-bold text-white shadow-offset transition-transform hover:-translate-y-0.5"
      >
        {t('cta')}
      </Link>
      <p className="mt-2 text-xs opacity-55">{t('ctaNote')}</p>

      <div className="mx-auto mt-10 max-w-md text-left">
        <Guarantee />
      </div>
    </main>
  );
}

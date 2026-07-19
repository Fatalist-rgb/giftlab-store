import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <span className="inline-block rounded-full border-2 border-ink bg-lime px-3 py-1 text-sm font-bold shadow-offset-sm">
        {t('badge')}
      </span>
      <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight sm:text-5xl">{t('title')}</h1>
      <p className="mx-auto mt-4 max-w-xl text-lg opacity-75">{t('sub')}</p>
      <Link
        href="/product"
        className="mt-8 inline-block rounded-2xl border-2 border-ink bg-mandarin px-6 py-3 font-display font-bold text-white shadow-offset transition-transform hover:-translate-y-0.5"
      >
        {t('cta')}
      </Link>
    </main>
  );
}

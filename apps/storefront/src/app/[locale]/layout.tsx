import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { CookieConsent } from '@/features/consent/CookieConsent';
import { Footer } from '@/components/Footer';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://giftlab-storefront.vercel.app';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // canonical + hreflang for every localized page (T062)
  return {
    metadataBase: new URL(SITE),
    title: { default: 'GiftLab — figurki personalizowane', template: '%s · GiftLab' },
    description:
      'Figurka z Twoją twarzą i imieniem. Zaprojektuj w 2 minuty — my wydrukujemy i dostarczymy.',
    alternates: {
      canonical: `/${locale}`,
      languages: { pl: '/pl', en: '/en', uk: '/uk', 'x-default': '/pl' },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations('nav');

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Space+Grotesk:wght@400..600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b-2 border-ink bg-white px-4">
            <Link href="/" className="flex items-center gap-1.5">
              <span className="font-display text-2xl font-extrabold">Gift</span>
              <span className="rounded-lg border-2 border-ink bg-mandarin px-1.5 font-display text-xl font-extrabold text-white">
                Lab
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-semibold">
              <Link href="/product" className="hover:text-mandarin">
                {t('shop')}
              </Link>
              <div className="flex items-center gap-1 rounded-full border-2 border-ink p-0.5">
                {routing.locales.map((l) => (
                  <Link
                    key={l}
                    href="/"
                    locale={l}
                    className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                      l === locale ? 'bg-ink text-white' : 'text-ink'
                    }`}
                  >
                    {l}
                  </Link>
                ))}
              </div>
            </nav>
          </header>
          {children}
          <Footer />
          <CookieConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

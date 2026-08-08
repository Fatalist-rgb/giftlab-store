import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { CookieConsent } from '@/features/consent/CookieConsent';
import { Footer } from '@/components/Footer';
import { SiteHeader } from '@/components/SiteHeader';
import { Rum } from '@/features/rum/Rum';
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
    title: {
      default: 'mavorashop — akrylowe figurki z brzuszkiem z Twojego zdjęcia',
      template: '%s · mavorashop',
    },
    description:
      'Akrylowa figurka z Twoją twarzą i miękkim brzuszkiem. 11 cm, wbudowany magnes, imię drukowane na figurce.',
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
          <SiteHeader />
          {children}
          <Footer />
          <CookieConsent />
          <Rum />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

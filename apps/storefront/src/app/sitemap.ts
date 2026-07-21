import type { MetadataRoute } from 'next';

/** Sitemap (T062): every locale variant of the public pages, with hreflang alternates. */
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://giftlab-storefront.vercel.app';
const LOCALES = ['pl', 'en', 'uk'] as const;
const PATHS = ['', '/product', '/catalog', '/cart', '/info/regulamin', '/info/privacy', '/info/cookies', '/info/zwroty', '/info/dostawa', '/info/kontakt'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${BASE}/${locale}${path}`,
      changeFrequency: path === '' || path === '/product' ? ('weekly' as const) : ('monthly' as const),
      priority: path === '/product' ? 1 : path === '' ? 0.8 : 0.4,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [l, `${BASE}/${l}${path}`])),
      },
    })),
  );
}

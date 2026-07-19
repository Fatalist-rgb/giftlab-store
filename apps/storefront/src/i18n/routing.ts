import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pl', 'en', 'uk'],
  defaultLocale: 'pl',
});

export type Locale = (typeof routing.locales)[number];

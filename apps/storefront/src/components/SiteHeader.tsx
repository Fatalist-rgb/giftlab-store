'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { CatalogBar } from '@/components/CatalogBar';

const LANG_NAMES: Record<string, string> = { pl: 'Polski', en: 'English', uk: 'Українська' };

function ChevDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * The approved header: wordmark, nav, one language SELECT (not three pills — it does
 * not grow when a fourth language lands) and the cart.
 *
 * Locale switching rewrites the current path rather than sending everyone home: a
 * visitor deep in the constructor who wants Polish expects the constructor in Polish,
 * not the landing page.
 */
export function SiteHeader() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const switchLocale = (next: string) => {
    const rest = pathname.replace(new RegExp(`^/(${routing.locales.join('|')})`), '') || '/';
    startTransition(() => router.replace(`/${next}${rest}`));
  };

  const links = (
    <>
      <Link href="/#szablony" onClick={() => setOpen(false)}>{t('shop')}</Link>
      <Link href="/jak-to-dziala" onClick={() => setOpen(false)}>{t('how')}</Link>
      <Link href="/opinie" onClick={() => setOpen(false)}>{t('opinions')}</Link>
      <Link href="/kontakt" onClick={() => setOpen(false)}>{t('contact')}</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 bg-white" style={{ borderBottom: 'var(--border)' }}>
      <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-1.5" aria-label="mavorashop">
          <span className="font-display text-[24px] font-extrabold tracking-tight">mavora</span>
          <span
            className="rounded-lg border-2 border-ink bg-mandarin px-2 py-[2px] font-display text-[19px] font-extrabold text-white"
            style={{ transform: 'rotate(-2deg)', boxShadow: '2px 2.5px 0 var(--ink)' }}
          >
            shop
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-[15px] font-medium lg:flex [&_a:hover]:text-mandarin">
          {links}
        </nav>

        <div className="flex items-center gap-2.5">
          <label className="lang-sel hidden md:inline-flex" data-testid="lang-select">
            <span className="sr-only">Language</span>
            <select value={locale} onChange={(e) => switchLocale(e.target.value)}
              aria-label="Language" disabled={pending}>
              {routing.locales.map((l) => (
                <option key={l} value={l}>{LANG_NAMES[l] ?? l}</option>
              ))}
            </select>
            <ChevDown />
          </label>

          <Link href="/cart" data-testid="cart-link" aria-label="Cart"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border-2 border-ink bg-white shs transition-colors hover:bg-cream">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4.5 7.5h15l-1.3 11a2 2 0 0 1-2 1.8H7.8a2 2 0 0 1-2-1.8z" />
              <path d="M9 7.5V6a3 3 0 0 1 6 0v1.5" />
            </svg>
          </Link>

          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border-2 border-ink bg-white shs lg:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.6" strokeLinecap="round" aria-hidden>
              {open ? <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>
                : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
            </svg>
          </button>
        </div>
      </div>

      <CatalogBar />

      {open && (
        <div className="lg:hidden" style={{ borderTop: 'var(--border)' }}>
          <div className="mx-auto flex max-w-6xl flex-col px-4 py-2 font-display text-lg font-bold [&_a]:py-3">
            {links}
            <label className="lang-sel py-3" style={{ display: 'flex', width: '100%' }}>
              <span className="sr-only">Language</span>
              <select value={locale} onChange={(e) => switchLocale(e.target.value)} aria-label="Language"
                style={{ height: 44, fontSize: 14, padding: '0 34px 0 15px', width: '100%' }}>
                {routing.locales.map((l) => (
                  <option key={l} value={l}>{LANG_NAMES[l] ?? l}</option>
                ))}
              </select>
              <ChevDown />
            </label>
          </div>
        </div>
      )}
    </header>
  );
}

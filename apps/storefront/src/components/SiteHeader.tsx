'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { CatalogBar } from '@/components/CatalogBar';

const LANG_NAMES: Record<string, string> = { pl: 'Polski', en: 'English', uk: 'Українська' };
const LANG_FLAGS: Record<string, string> = { pl: '🇵🇱', en: '🇬🇧', uk: '🇺🇦' };

/** The mobile menu's category tiles — same entries as the pinned bar, icon + name
 *  (the reference pattern), only the figurines are a live link today. */
const MENU_TILES = [
  { key: 'cbFigurines', icon: '🍺', href: '/catalog', active: true },
  { key: 'cbOccasions', icon: '🎁' },
  { key: 'cbForWhom', icon: '👪' },
  { key: 'cbPets', icon: '🐶' },
  { key: 'cbHolidays', icon: '🎄' },
  { key: 'cbNew', icon: '✨' },
] as const;

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

  // the open menu owns the screen — the page behind it must not scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

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

      {/* mobile menu: a full-screen sheet — category TILES first (the reference
          pattern: icon + name, two columns), then the utility rows, language last */}
      {open && (
        <div className="fixed inset-0 z-[95] overflow-y-auto bg-cream lg:hidden" data-testid="mobile-menu">
          <div className="sticky top-0 flex items-center justify-between bg-cream px-4 py-3" style={{ borderBottom: 'var(--border)' }}>
            <span className="font-display text-xl font-extrabold">{t('menuTitle')}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border-2 border-ink bg-white shs"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="px-4 pb-10 pt-4">
            <div className="grid grid-cols-2 gap-3">
              {MENU_TILES.map((tile) =>
                'href' in tile ? (
                  <Link
                    key={tile.key}
                    href={tile.href}
                    onClick={() => setOpen(false)}
                    className="flex flex-col gap-2 rounded-[14px] border-2 border-ink bg-white p-3.5 no-underline shs"
                  >
                    <span className="text-[26px] leading-none" aria-hidden>{tile.icon}</span>
                    <span className="font-display text-[14.5px] font-bold leading-tight text-mandarin">{t(tile.key)}</span>
                  </Link>
                ) : (
                  <span
                    key={tile.key}
                    aria-disabled="true"
                    className="flex flex-col gap-2 rounded-[14px] border-2 bg-white p-3.5 shs"
                    style={{ borderColor: 'rgba(23,19,26,.35)', opacity: 0.75 }}
                  >
                    <span className="text-[26px] leading-none" style={{ filter: 'grayscale(.4)' }} aria-hidden>{tile.icon}</span>
                    <span className="font-display text-[14.5px] font-bold leading-tight">
                      {t(tile.key)}
                      <span className="ml-1.5 inline-block rounded-full border-2 border-ink bg-pink px-[7px] py-px align-middle text-[9px] font-bold text-white">
                        {t('cbSoon')}
                      </span>
                    </span>
                  </span>
                ),
              )}
            </div>

            <div className="mt-5 rounded-[14px] border-2 border-ink bg-white shs">
              <div className="flex flex-col font-display text-[16px] font-bold [&_a]:px-4 [&_a]:py-3.5 [&_a]:no-underline [&_a+a]:border-t-2 [&_a+a]:[border-color:rgba(23,19,26,.12)]">
                {links}
              </div>
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-[14px] border-2 border-ink bg-white px-4 py-2 shs">
              <span className="text-[20px]" aria-hidden>{LANG_FLAGS[locale] ?? '🌐'}</span>
              <span className="sr-only">Language</span>
              <select
                value={locale}
                onChange={(e) => switchLocale(e.target.value)}
                aria-label="Language"
                disabled={pending}
                className="w-full bg-transparent py-2 font-display text-[15px] font-bold outline-none"
                style={{ appearance: 'none', WebkitAppearance: 'none', border: 'none' }}
              >
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

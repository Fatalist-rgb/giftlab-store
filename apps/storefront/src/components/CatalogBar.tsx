'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { POSES } from '@/lib/poses';

/**
 * The pinned category bar (wanderprints-style), approved on the demo.
 *
 * It renders INSIDE the sticky header, so it is always on screen with no offset
 * bookkeeping of its own; the mega panel anchors to the header's bottom edge, so the
 * pointer never crosses a dead gap on its way down. Only the belly figurines are
 * buyable today, so only they are a link — every other entry is muted behind the
 * "wkrótce" pill, because a dead link dressed as a category is worse than an honest
 * "soon". Below md the bar becomes a scrollable chip row (hover does not exist there).
 */
export function CatalogBar() {
  const t = useTranslations('nav');
  const tCart = useTranslations('cart');

  const soon = (
    <span className="ml-1.5 inline-block rounded-full border-2 border-ink bg-pink px-[7px] py-px align-middle text-[9.5px] font-bold text-white">
      {t('cbSoon')}
    </span>
  );
  const MUTED = ['cbOccasions', 'cbForWhom', 'cbPets', 'cbHolidays', 'cbNew'] as const;
  const megaLink = 'block py-[5px] text-[14px] text-ink no-underline hover:underline';

  return (
    <nav aria-label={t('cbAria')} data-testid="catalog-bar" className="bg-white" style={{ borderTop: '2px solid rgba(23,19,26,.1)' }}>
      {/* desktop: centered items, the figurines carry the mega panel */}
      <div className="mx-auto hidden max-w-6xl items-center justify-center gap-8 px-4 md:flex">
        <div className="group">
          <Link
            href="/catalog"
            className="inline-flex items-center py-2.5 text-[14.5px] font-semibold text-mandarin no-underline hover:underline"
            style={{ textUnderlineOffset: 6, textDecorationThickness: 2 }}
          >
            {t('cbFigurines')}
          </Link>
          <div
            className="absolute inset-x-0 top-full hidden bg-white group-hover:block"
            style={{ borderTop: '2px solid rgba(23,19,26,.12)', borderBottom: 'var(--border)', boxShadow: '0 16px 26px -18px rgba(23,19,26,.4)' }}
          >
            <div className="mx-auto flex max-w-6xl flex-wrap px-6 py-6" style={{ gap: '2.2rem 3.5rem' }}>
              <div className="min-w-[150px]">
                <p className="m-0 mb-2 font-display text-[14.5px] font-extrabold">{t('cbPoses')}</p>
                {POSES.map((p) => (
                  <Link key={p.id} href={`/product?t=${p.id}`} className={megaLink} style={{ textUnderlineOffset: 4 }}>
                    {tCart(`pose.${p.id}`)}
                  </Link>
                ))}
              </div>
              <div className="min-w-[150px]">
                <p className="m-0 mb-2 font-display text-[14.5px] font-extrabold">{t('cbStart')}</p>
                <Link href="/product" className={megaLink} style={{ textUnderlineOffset: 4 }}>{t('cbCreator')}</Link>
                <Link href="/#szablony" className={megaLink} style={{ textUnderlineOffset: 4 }}>{t('cbTemplates')}</Link>
                <Link href="/catalog" className={megaLink} style={{ textUnderlineOffset: 4 }}>{t('cbFull')}</Link>
              </div>
            </div>
          </div>
        </div>
        {MUTED.map((k) => (
          <span key={k} aria-disabled="true" className="inline-flex cursor-default items-center py-2.5 text-[14.5px] font-semibold" style={{ color: 'rgba(23,19,26,.45)' }}>
            {t(k)}
            {soon}
          </span>
        ))}
      </div>

      {/* mobile: one scrollable chip row */}
      <div className="flex gap-2 overflow-x-auto px-3 py-[7px] md:hidden">
        <Link href="/catalog" className="whitespace-nowrap rounded-full border-2 border-ink bg-white px-3 py-1 text-[12.5px] font-bold text-mandarin no-underline">
          {t('cbFigurines')}
        </Link>
        {MUTED.map((k) => (
          <span key={k} className="whitespace-nowrap rounded-full bg-white px-3 py-1 text-[12.5px] font-bold" style={{ border: '2px solid rgba(23,19,26,.3)', color: 'rgba(23,19,26,.45)' }}>
            {t(k)}
            {soon}
          </span>
        ))}
      </div>
    </nav>
  );
}

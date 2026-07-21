'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { loadAnalytics, readConsent, saveConsent } from '@/lib/analytics';

/**
 * Cookie consent (T061, art. 399 PKE / RODO). Shown until a choice is made; "accept
 * all" and "necessary only" carry EQUAL visual weight (no dark patterns — Constitution
 * VIII), with per-category settings behind one tap. The choice is stored locally and
 * recorded on the backend for provability.
 */
export function CookieConsent() {
  const t = useTranslations('cookies');
  const [visible, setVisible] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (existing) {
      loadAnalytics(); // re-arm on revisit (script never persists across loads)
    } else {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const decide = (choice: { analytics: boolean; marketing: boolean }) => {
    saveConsent(choice);
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4" role="dialog" aria-live="polite" aria-label={t('title')}>
      <div className="mx-auto max-w-xl rounded-2xl border-2 border-ink bg-white p-4 shadow-offset">
        <p className="font-display font-bold">{t('title')}</p>
        <p className="mt-1 text-sm leading-relaxed opacity-75">
          {t('body')}{' '}
          <Link href="/info/cookies" className="underline underline-offset-2">
            {t('more')}
          </Link>
        </p>

        {settings && (
          <div className="mt-3 space-y-2 rounded-xl bg-cream p-3 text-sm">
            <label className="flex items-center gap-2 opacity-60">
              <input type="checkbox" checked disabled className="h-4 w-4 accent-ink" />
              {t('necessary')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="h-4 w-4 accent-ink"
                data-testid="consent-analytics"
              />
              {t('analytics')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="h-4 w-4 accent-ink"
                data-testid="consent-marketing"
              />
              {t('marketing')}
            </label>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => decide({ analytics: false, marketing: false })}
            data-testid="consent-necessary"
            className="rounded-xl border-2 border-ink bg-white px-3 py-2.5 text-sm font-bold"
          >
            {t('necessaryOnly')}
          </button>
          <button
            onClick={() => decide({ analytics: true, marketing: true })}
            data-testid="consent-accept"
            className="rounded-xl border-2 border-ink bg-mandarin px-3 py-2.5 text-sm font-bold text-white"
          >
            {t('acceptAll')}
          </button>
        </div>
        {settings ? (
          <button
            onClick={() => decide({ analytics, marketing })}
            data-testid="consent-save"
            className="mt-2 w-full rounded-xl border-2 border-ink bg-cream px-3 py-2 text-sm font-bold"
          >
            {t('save')}
          </button>
        ) : (
          <button onClick={() => setSettings(true)} className="mt-2 w-full text-center text-xs underline underline-offset-2 opacity-60">
            {t('settings')}
          </button>
        )}
      </div>
    </div>
  );
}

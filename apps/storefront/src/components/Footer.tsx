import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * Footer with the seller identity block (T069 — required by Polish consumer law: the
 * trader's name, address and contact must be easy to find) and the legal page links.
 * Company placeholders are clearly marked until the client provides the registration
 * data (name, address, NIP).
 */
export async function Footer() {
  const t = await getTranslations('footer');
  const legal = [
    ['regulamin', t('terms')],
    ['privacy', t('privacy')],
    ['cookies', t('cookies')],
    ['zwroty', t('returns')],
    ['dostawa', t('delivery')],
    ['kontakt', t('contact')],
  ] as const;

  return (
    <footer className="mt-16 border-t-2 border-ink bg-white">
      <div className="mx-auto grid max-w-4xl gap-8 px-5 py-10 sm:grid-cols-2">
        <div>
          <p className="font-display text-lg font-extrabold">GiftLab</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed opacity-70">{t('company')}</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {legal.map(([slug, label]) => (
            <Link key={slug} href={`/info/${slug}`} className="hover:text-mandarin">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="border-t border-ink/10 px-5 py-4 text-center text-xs opacity-50">
        © {new Date().getFullYear()} GiftLab · {t('rights')}
      </p>
    </footer>
  );
}

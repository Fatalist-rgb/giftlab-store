import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PayMarks } from '@/components/PayMarks';
import { IconFb, IconIg, IconTt } from '@/components/icons';

/**
 * The approved four-column footer, plus the seller identity block Polish consumer law
 * requires (T069): the trader's name, address and contact have to be easy to find.
 * The company line stays a clearly marked placeholder until the registration data
 * arrives — a made-up NIP in the footer is worse than a visible gap.
 */
export async function Footer() {
  const t = await getTranslations('footer');

  const L = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link href={href} className="block py-1 text-[14.5px] text-white/70 transition-colors hover:text-white">
      {children}
    </Link>
  );

  return (
    <footer className="text-white" style={{ background: 'var(--ink)' }}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-[24px] font-extrabold">mavora</span>
            <span
              className="rounded-lg border-2 border-white/90 bg-mandarin px-2 py-[2px] font-display text-[19px] font-extrabold text-white"
              style={{ transform: 'rotate(-2deg)' }}
            >
              shop
            </span>
          </div>
          <p className="mt-3 text-[14.5px] text-white/60">{t('slogan')}</p>
          <div className="mt-4 flex gap-2.5">
            {([['Instagram', IconIg], ['TikTok', IconTt], ['Facebook', IconFb]] as const).map(([name, I]) => (
              <a
                key={name}
                href="#"
                aria-label={name}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/35 text-white/80 transition-colors hover:border-white hover:text-white"
              >
                <I />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-display text-[16px] font-bold">{t('colShop')}</h3>
          <L href="/product">{t('creator')}</L>
          <L href="/#szablony">{t('templates')}</L>
          <L href="/jak-to-dziala">{t('how')}</L>
        </div>

        <div>
          <h3 className="mb-3 font-display text-[16px] font-bold">{t('colHelp')}</h3>
          <L href="/kontakt">{t('contact')}</L>
          <L href="/#faq">{t('faq')}</L>
          <L href="/info/dostawa">{t('delivery')}</L>
          <L href="/info/zwroty">{t('returns')}</L>
          <L href="/info/regulamin">{t('terms')}</L>
          <L href="/info/privacy">{t('privacy')}</L>
          <L href="/info/cookies">{t('cookies')}</L>
        </div>

        <div>
          <h3 className="mb-3 font-display text-[16px] font-bold">{t('colPay')}</h3>
          <PayMarks />
          <p className="mt-4 text-[14px] text-white/60">{t('ship48')}</p>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-[12.5px] text-white/50">
          <span className="whitespace-pre-line">{t('company')}</span>
          <span>
            © {new Date().getFullYear()} mavorashop · {t('rights')}
          </span>
        </div>
      </div>
    </footer>
  );
}

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ArrowR, IcoClock, IcoPay, IcoTruck, SecHead } from '@/components/icons';

/** The mailbox the shop answers from. Overridable so it can change without a code
 *  edit — but it must be a mailbox that EXISTS, or the page invites mail into a void. */
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'kontakt@mavorashop.eu';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages' });
  return {
    title: t('konTitle'),
    description: t('konLead'),
    alternates: {
      canonical: `/${locale}/kontakt`,
      languages: { pl: '/pl/kontakt', en: '/en/kontakt', uk: '/uk/kontakt', 'x-default': '/pl/kontakt' },
    },
  };
}

/**
 * Contact.
 *
 * A plain page, deliberately: an e-mail address, working hours and a stated response
 * time beat a contact form here. A form would need its own endpoint, its own spam
 * defence and its own GDPR basis, and it hides the address that Polish consumer law
 * wants easy to find in the first place.
 */
export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages');
  const f = await getTranslations('footer');
  const h = await getTranslations('home');

  const rows = [
    { I: IcoPay, k: t('konMail'), v: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
    { I: IcoClock, k: t('konHours'), v: t('konHoursV') },
    { I: IcoTruck, k: t('konReply'), v: t('konReplyV') },
  ];

  return (
    <main>
      <section className="mx-auto max-w-3xl px-4 pb-14 pt-10 sm:pt-14">
        <SecHead title={t('konTitle')} sub={t('konLead')} />

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {rows.map(({ I, k, v, href }, i) => (
            <div
              key={k}
              className="rounded-[var(--r-card)] bg-white p-5 b2 sh rv"
              style={{ '--d': `${0.06 * i}s`, transform: `rotate(${[-1.4, 1.2, -1][i]}deg)` } as React.CSSProperties}
            >
              <I />
              <p className="mt-3 text-[11.5px] font-semibold uppercase tracking-wider opacity-50">{k}</p>
              {href ? (
                <a href={href} className="mt-0.5 block break-words font-display text-[16px] font-bold underline underline-offset-2 hover:text-mandarin">
                  {v}
                </a>
              ) : (
                <p className="mt-0.5 font-display text-[16px] font-bold">{v}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[var(--r-card)] bg-cream p-5 b2 shs">
          <h2 className="font-display text-[18px] font-bold">{t('konOrder')}</h2>
          <p className="mt-2 text-[14.5px] leading-snug opacity-75">{t('konOrderD')}</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link href="/#faq" className="btn-s px-4 py-2 text-[14px]">{t('konFaq')}</Link>
            <Link href="/info/dostawa" className="btn-s px-4 py-2 text-[14px]">{t('konDelivery')}</Link>
          </div>
        </div>

        {/* the trader identity: same source as the footer, so the two cannot disagree */}
        <p className="mt-8 whitespace-pre-line text-[13px] leading-relaxed opacity-60">{f('company')}</p>

        <div className="mt-10 text-center">
          <Link href="/product" className="btn-p px-7 text-[16px]">
            {h('cta')}
            <ArrowR />
          </Link>
        </div>
      </section>
    </main>
  );
}

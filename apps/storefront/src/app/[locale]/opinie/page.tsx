import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Reviews } from '@/features/reviews/Reviews';
import { ArrowR, SecHead } from '@/components/icons';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages' });
  return {
    title: t('opTitle'),
    description: t('opLead'),
    alternates: {
      canonical: `/${locale}/opinie`,
      languages: { pl: '/pl/opinie', en: '/en/opinie', uk: '/uk/opinie', 'x-default': '/pl/opinie' },
    },
  };
}

/**
 * The reviews page. Same block as the landing carries — one component, one API call,
 * one moderation policy — with a heading that states the policy in plain words:
 * negatives stay up, text is not edited. That sentence is the whole point of the page.
 */
export default async function OpinionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages');
  const h = await getTranslations('home');

  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:pt-14">
        <SecHead title={t('opTitle')} sub={t('opLead')} />
      </section>

      <Reviews full />

      <section className="mx-auto max-w-6xl px-4 pb-16 text-center">
        <Link href="/product" className="btn-p px-7 text-[16px]">
          {h('cta')}
          <ArrowR />
        </Link>
      </section>
    </main>
  );
}

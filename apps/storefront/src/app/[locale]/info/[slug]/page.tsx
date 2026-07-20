import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { fetchContentPage } from '@/lib/backend';

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await fetchContentPage(slug, locale);
  if (!page) return {};
  return {
    title: page.meta_title ?? page.title,
    description: page.meta_description ?? undefined,
  };
}

export default async function InfoPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const page = await fetchContentPage(slug, locale);
  if (!page) notFound();

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{page.title}</h1>
      <div className="mt-6 whitespace-pre-wrap leading-relaxed opacity-90">{page.body}</div>
    </main>
  );
}

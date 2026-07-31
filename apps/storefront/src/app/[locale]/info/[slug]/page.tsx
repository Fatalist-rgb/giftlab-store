import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
      <div className="mt-6 leading-relaxed opacity-90">
        {/* Markdown so the operator can structure legal pages from the admin editor.
            Rendered on the server — no markdown code reaches the browser bundle. */}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h2 className="mt-8 font-display text-2xl font-bold first:mt-0">{children}</h2>
            ),
            h2: ({ children }) => <h3 className="mt-7 font-display text-xl font-bold">{children}</h3>,
            h3: ({ children }) => <h4 className="mt-6 font-display text-lg font-bold">{children}</h4>,
            p: ({ children }) => <p className="mt-3">{children}</p>,
            ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-5">{children}</ul>,
            ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-5">{children}</ol>,
            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            a: ({ href, children }) => (
              <a href={href} className="underline underline-offset-2 hover:text-mandarin">
                {children}
              </a>
            ),
            table: ({ children }) => (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border-b-2 border-ink px-2 py-2 text-left font-bold">{children}</th>
            ),
            td: ({ children }) => <td className="border-b border-ink/10 px-2 py-2 align-top">{children}</td>,
            hr: () => <hr className="mt-6 border-ink/15" />,
          }}
        >
          {page.body}
        </ReactMarkdown>
      </div>
    </main>
  );
}

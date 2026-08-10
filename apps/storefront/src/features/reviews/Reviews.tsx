'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CheckIcon, SecHead, Stars as StarRow } from '@/components/icons';

type Review = {
  id: string;
  rating: number;
  body: string;
  author: string;
  verifiedBuyer: boolean;
  publishedAt: string | null;
  photoUrl?: string | null;
  avatarUrl?: string | null;
  variantLabel?: string | null;
};
type Summary = { count: number; average: number | null; distribution: Record<string, number> };

const Stars = ({ value, s = 14 }: { value: number; s?: number }) => (
  <span aria-label={`${value}/5`}>
    <StarRow n={value} s={s} />
  </span>
);

/**
 * Reviews (T066): summary, verified-buyer marking and — required by Omnibus — an
 * explicit disclosure of HOW verification works. Submissions go through moderation.
 *
 * Wears the approved design's "Opinie" skin, but the cards are whatever the reviews
 * module actually returns. The demo showed four written-in testimonials; inventing
 * those on a live shop is a banned commercial practice in the EU (UCPD Annex I), so
 * the layout is reproduced and the content is not.
 */
export function Reviews() {
  const t = useTranslations('reviews');
  const locale = useLocale();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [author, setAuthor] = useState('');
  const [email, setEmail] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/gl/reviews')
      .then(async (r) => (r.ok ? await r.json() : null))
      .then((b: { summary: Summary; reviews: Review[] } | null) => {
        if (b) {
          setSummary(b.summary);
          setReviews(b.reviews);
        }
      })
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(false);
    try {
      const res = await fetch('/api/gl/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          rating,
          body,
          authorName: author,
          email: email || undefined,
          orderDisplayId: orderNo ? Number(orderNo) : undefined,
          locale,
        }),
      });
      if (!res.ok) throw new Error('submit failed');
      setSent(true);
      setFormOpen(false);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="opinie" className="mx-auto max-w-6xl px-4 py-14 sm:py-20" data-testid="reviews">
      <SecHead title={t('title')} sub={t('subtitle')} />

      {summary && summary.count > 0 ? (
        <div className="mt-5 flex justify-center">
          <span className="stkr bg-lime px-4 py-1.5 text-[15px]" style={{ transform: 'rotate(-1.5deg)' }}>
            <b className="font-display text-[20px]">{summary.average}</b>
            <Stars value={Math.round(summary.average ?? 0)} s={15} />
            <span className="text-[13px] font-semibold opacity-70">{t('count', { count: summary.count })}</span>
          </span>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm opacity-60">{t('empty')}</p>
      )}

      {reviews.length > 0 && (
        <div className="mt-9 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {reviews.slice(0, 8).map((r, i) => (
            <figure
              key={r.id}
              className="m-0 flex h-full flex-col rounded-[var(--r-card)] bg-white p-3.5 b2 sh"
              style={{ transform: `rotate(${[-1.4, 1.2, -1, 1.6][i % 4]}deg)` }}
            >
              {r.photoUrl && (
                <div className="mb-2.5 overflow-hidden rounded-[11px] border-2 border-ink" style={{ aspectRatio: '4/3' }}>
                  <img src={r.photoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
              )}
              <Stars value={r.rating} />
              <blockquote className="mt-2 flex-1 whitespace-pre-wrap text-[13.5px] leading-snug opacity-85">
                {r.body}
              </blockquote>
              <figcaption className="mt-3 flex items-center gap-2.5 pt-2.5" style={{ borderTop: '2px dashed rgba(23,19,26,.18)' }}>
                {r.avatarUrl && (
                  <img src={r.avatarUrl} alt="" loading="lazy" className="h-8 w-8 shrink-0 rounded-full border-2 border-ink object-cover" />
                )}
                <div className="min-w-0">
                  <p className="m-0 truncate font-display text-[13.5px] font-bold leading-tight">{r.author}</p>
                  {r.variantLabel && <p className="m-0 truncate text-[11.5px] opacity-55">{r.variantLabel}</p>}
                </div>
              </figcaption>
              {r.verifiedBuyer && (
                <span className="mt-2.5 inline-flex items-center gap-1 text-[10.5px] font-semibold" style={{ color: 'var(--blue)' }}>
                  <CheckIcon s={12} />
                  {t('verified')}
                </span>
              )}
            </figure>
          ))}
        </div>
      )}

      {/* Omnibus: how reviews are verified — stated, not implied */}
      <p className="mx-auto mt-7 max-w-3xl rounded-xl bg-cream px-3 py-2 text-center text-xs leading-relaxed opacity-70">
        {t('verificationNote')}
      </p>

      <div className="mx-auto mt-5 max-w-2xl">
      {sent ? (
        <p className="mt-5 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900">
          {t('thanks')}
        </p>
      ) : formOpen ? (
        <form onSubmit={submit} className="mt-5 space-y-3 rounded-2xl border-2 border-ink bg-cream p-4">
          <div className="flex items-center gap-1" role="radiogroup" aria-label={t('yourRating')}>
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRating(v)}
                aria-checked={rating === v}
                role="radio"
                className={`text-2xl ${v <= rating ? 'text-mandarin' : 'opacity-25'}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            required
            minLength={3}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('bodyPlaceholder')}
            className="h-24 w-full rounded-xl border-2 border-ink px-3 py-2 text-sm"
          />
          <input required value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={t('name')} className="w-full rounded-xl border-2 border-ink px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('emailOptional')} className="rounded-xl border-2 border-ink px-3 py-2 text-sm" />
            <input inputMode="numeric" value={orderNo} onChange={(e) => setOrderNo(e.target.value.replace(/\D/g, ''))} placeholder={t('orderOptional')} className="rounded-xl border-2 border-ink px-3 py-2 text-sm" />
          </div>
          <p className="text-xs opacity-55">{t('verifyHint')}</p>
          {error && <p className="text-sm font-semibold text-red-700">{t('error')}</p>}
          <button type="submit" disabled={sending} className="w-full rounded-xl border-2 border-ink bg-mandarin py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {sending ? '…' : t('submit')}
          </button>
        </form>
      ) : (
        <button onClick={() => setFormOpen(true)} className="btn-s mt-1 px-4 py-2 text-[14px]">
          {t('write')}
        </button>
      )}
      </div>
    </section>
  );
}

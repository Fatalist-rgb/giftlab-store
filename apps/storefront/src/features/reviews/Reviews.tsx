'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Review = {
  id: string;
  rating: number;
  body: string;
  author: string;
  verifiedBuyer: boolean;
  publishedAt: string | null;
};
type Summary = { count: number; average: number | null; distribution: Record<string, number> };

const Stars = ({ value }: { value: number }) => (
  <span aria-label={`${value}/5`} className="text-mandarin">
    {'★'.repeat(value)}
    <span className="opacity-25">{'★'.repeat(5 - value)}</span>
  </span>
);

/**
 * PDP reviews (T066): summary, verified-buyer marking and — required by Omnibus — an
 * explicit disclosure of HOW verification works. Submissions go through moderation.
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
    <section className="mx-auto mt-12 max-w-2xl px-5 pb-16" data-testid="reviews">
      <h2 className="font-display text-2xl font-extrabold">{t('title')}</h2>

      {summary && summary.count > 0 ? (
        <p className="mt-2 text-sm opacity-75">
          <Stars value={Math.round(summary.average ?? 0)} /> {summary.average} / 5 · {t('count', { count: summary.count })}
        </p>
      ) : (
        <p className="mt-2 text-sm opacity-60">{t('empty')}</p>
      )}

      {/* Omnibus: how reviews are verified — stated, not implied */}
      <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-xs leading-relaxed opacity-70">
        {t('verificationNote')}
      </p>

      <div className="mt-5 space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <b>{r.author}</b>
              <Stars value={r.rating} />
              {r.verifiedBuyer && (
                <span className="rounded-full bg-lime px-2 py-0.5 text-xs font-bold">{t('verified')}</span>
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm opacity-85">{r.body}</p>
          </div>
        ))}
      </div>

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
        <button onClick={() => setFormOpen(true)} className="mt-5 btn-s px-4 py-2 text-[14px]">
          {t('write')}
        </button>
      )}
    </section>
  );
}

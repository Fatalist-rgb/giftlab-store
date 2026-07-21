import { useTranslations } from 'next-intl';

/**
 * The guarantee block (T065): approval before production, remake-or-refund, no return
 * shipping games. Shown on the PDP and beside checkout — it is the counterweight to
 * the withdrawal exclusion (the buyer gives up the 14-day right, the seller commits
 * to making it right instead).
 */
export function Guarantee({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('guarantee');
  const points = ['approve', 'remake', 'shipping'] as const;

  return (
    <div className={compact ? 'rounded-xl bg-cream p-3' : 'rounded-2xl border-2 border-ink bg-cream p-4 shadow-offset-sm'}>
      {!compact && <p className="font-display font-bold">{t('title')}</p>}
      <ul className={`${compact ? '' : 'mt-2'} space-y-1.5 text-sm leading-snug`}>
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span aria-hidden className="text-mandarin">✓</span>
            <span className="opacity-80">{t(p)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

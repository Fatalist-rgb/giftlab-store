import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Burst, IcoTruck, Sparkle } from '@/components/icons';
import { POSES, type PoseId } from '@/lib/poses';

/**
 * Small pieces shared by the cart, the checkout summary and the order confirmation —
 * one file, because a line item must look identical in all three places.
 */

/**
 * What checkout actually charges for delivery. ONE constant so the cart preview, the
 * checkout summary and the legal "Dostawa" page can never quote three different
 * numbers — it mirrors the single courier option seeded on the backend
 * (seed-shipping.ts, flat 15.99 PLN); the authoritative charge still comes from Medusa
 * when the shipping method is added.
 */
export const SHIP_COURIER_PLN = 15.99;

export const zl = (v: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(v);

/** The pose preview in a bordered tile — the demo's ItemThumb. */
export function ItemThumb({ pose, size = 'sm' }: { pose?: string | null; size?: 'xs' | 'sm' }) {
  const p = POSES.find((x) => x.id === (pose as PoseId)) ?? POSES[0]!;
  const box = size === 'xs' ? 48 : 72;
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-[12px] border-2 border-ink bg-cream"
      style={{ width: box, height: box }}
    >
      <Image
        src={p.src}
        alt=""
        width={p.w}
        height={p.h}
        className="h-auto max-h-[85%] w-auto max-w-[85%]"
      />
    </div>
  );
}

/** One line's meta: pose · printed name · spec — same string in cart and confirmation. */
export function itemMeta(
  t: ReturnType<typeof useTranslations<'cart'>>,
  item: { pose?: string | null; printedName?: string | null },
): string {
  const parts: string[] = [];
  if (item.pose) parts.push(t(`pose.${item.pose as PoseId}`));
  if (item.printedName) parts.push(`${t('nameChip')}: ${item.printedName}`);
  if (!parts.length) parts.push(t('specLine'));
  return parts.join(' · ');
}

/** The green delivery banner with the real estimated window. */
export function DeliveryRow({
  label,
  from,
  to,
  locale,
}: {
  label: string;
  from: string | null;
  to: string | null;
  locale: string;
}) {
  if (!from || !to) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'uk' ? 'uk-UA' : locale === 'en' ? 'en-GB' : 'pl-PL', {
      day: 'numeric',
      month: 'long',
    });
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border-2 border-ink bg-lime px-3.5 py-2.5 shs">
      <IcoTruck />
      <span className="text-[13.5px]">
        <b className="font-display">{label}:</b> {fmt(from)} – {fmt(to)}
      </span>
    </div>
  );
}

/** The demo's empty-cart illustration: a shopping bag with a wavy receipt. */
export function EmptyCartArt() {
  return (
    <div className="relative mx-auto" style={{ width: 220, height: 206 }} aria-hidden="true">
      <Burst s={56} c="var(--lime)" />
      <span className="absolute left-0 top-6"><Sparkle s={34} c="var(--pink)" /></span>
      <svg
        viewBox="0 0 180 170"
        style={{ width: 180, margin: '14px auto 0', transform: 'rotate(-3deg)', display: 'block' }}
        fill="none"
        aria-hidden="true"
      >
        <path d="M35 52h110l-9 95a12 12 0 0 1-12 11H56a12 12 0 0 1-12-11l-9-95Z" fill="var(--mandarin)" stroke="var(--ink)" strokeWidth="5" strokeLinejoin="round" />
        <path d="M62 52v-9a28 28 0 0 1 56 0v9" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
        <rect x="58" y="79" width="64" height="44" rx="10" fill="var(--cream)" stroke="var(--ink)" strokeWidth="4" transform="rotate(-4 90 101)" />
        <path d="M70 101c5-5 8 4 13-1s8 4 13-1 8 4 13-1" stroke="var(--pink)" strokeWidth="4" strokeLinecap="round" transform="rotate(-4 90 101)" />
      </svg>
    </div>
  );
}

/** Polish-style plural bucket: 1 → one, 2-4 → few, 5+ → many (uk shares the rule). */
export function pluralKey(n: number): 'itemOne' | 'itemFew' | 'itemMany' {
  if (n === 1) return 'itemOne';
  const d = n % 10;
  const h = n % 100;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'itemFew';
  return 'itemMany';
}

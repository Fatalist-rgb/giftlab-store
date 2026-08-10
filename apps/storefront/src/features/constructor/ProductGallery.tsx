'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/**
 * One frame, one rail — the layout the client approved.
 *
 * The rail on the left drives a single frame that holds EITHER the live build or a
 * product photo. The page used to carry the preview and a separate photo slider, which
 * showed the same shots twice and pushed the buy button below the fold. The live build
 * is not in the rail: at 58px a figurine reads as an empty tile, and "back to the
 * preview" says it better.
 */
const SHOTS = [
  { k: 'fridge', src: '/photos/scene-fridge-tall.webp', full: '/photos/scene-fridge-tall.webp', ar: '4/5' },
  { k: 'table', src: '/photos/scene-desk.webp', full: '/photos/scene-desk.webp', ar: '3/2' },
  { k: 'couple', src: '/photos/ugc-couple-shelf.webp', full: '/photos/ugc-couple-shelf.webp', ar: '1/1' },
  { k: 'lezy', src: '/photos/real-lying-wide.webp', full: '/photos/real-lying-wide.webp', ar: '4/3' },
  { k: 'woman', src: '/photos/ugc-woman-gift.webp', full: '/photos/ugc-woman-gift.webp', ar: '1/1' },
] as const;

export function ProductGallery({ live }: { live: ReactNode }) {
  const t = useTranslations('product');
  const [shot, setShot] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const cur = shot === null ? null : SHOTS[shot]!;

  return (
    <div>
      <div className="flex items-start gap-2">
        {/* rail: fixed narrow column so the frame keeps a predictable width, and it
            scrolls on its own once a fifth photo lands */}
        <div
          className="flex shrink-0 basis-[58px] flex-col gap-[7px] overflow-y-auto p-px sm:basis-[66px]"
          style={{ maxHeight: 460, scrollbarWidth: 'none' }}
          data-testid="gal-rail"
        >
          {SHOTS.map((s, k) => (
            <button
              key={s.k}
              type="button"
              onClick={() => setShot(k)}
              aria-current={shot === k}
              data-testid={`gal-thumb-${k}`}
              aria-label={t(`shot_${s.k}`)}
              title={t(`shot_${s.k}`)}
              className="block aspect-square w-full overflow-hidden rounded-[10px] border-2 bg-white shs transition-transform hover:-translate-y-px"
              style={
                shot === k
                  ? { borderColor: 'var(--mandarin)', boxShadow: '0 0 0 2px var(--mandarin)' }
                  : { borderColor: 'var(--ink)' }
              }
            >
              <Image src={s.src} alt="" width={200} height={200} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        {/* the one frame */}
        <div className="relative min-w-0 flex-1">
          {cur ? (
            <button
              type="button"
              onClick={() => setZoom(true)}
              data-testid="gal-main"
              aria-label={t('enlarge')}
              className="block w-full overflow-hidden rounded-[16px] border-2 border-ink bg-white shs"
              style={{ aspectRatio: cur.ar, maxHeight: 440, cursor: 'zoom-in' }}
            >
              <Image
                src={cur.full}
                alt={t(`shot_${cur.k}`)}
                width={1200}
                height={900}
                data-testid="gal-main-img"
                className="h-full w-full object-contain"
              />
            </button>
          ) : (
            live
          )}
        </div>
      </div>

      {shot !== null && (
        <div className="mt-1.5 flex items-center justify-between gap-2 px-0.5">
          <button
            type="button"
            onClick={() => setShot(null)}
            data-testid="gal-back"
            className="text-[11.5px] underline underline-offset-2 opacity-60 hover:opacity-100"
          >
            {t('backToPreview')}
          </button>
          <span className="shrink-0 text-[11px] tabular-nums opacity-55" data-testid="gal-count">
            {shot + 1} / {SHOTS.length}
          </span>
        </div>
      )}

      {zoom && cur && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(23,19,26,.82)' }}
          role="dialog"
          aria-modal="true"
          onClick={() => setZoom(false)}
          data-testid="lightbox"
        >
          <Image
            src={cur.full}
            alt={t(`shot_${cur.k}`)}
            width={1400}
            height={1050}
            className="block max-h-[80vh] w-auto max-w-full rounded-[16px] bg-white"
            style={{ border: '2.5px solid var(--ink)', objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  );
}

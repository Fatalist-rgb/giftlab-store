'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkle } from '@/components/icons';

export type HeroSlide = {
  src: string;
  /** the sticker that pops in the frame's corner */
  badge: string;
  /** the caption under the frame */
  cap: string;
  /** sticker colour rotation keeps the wall from looking stamped */
  badgeBg: 'mandarin' | 'lime' | 'pink' | 'blue';
};

const HOLD_MS = 4200;

const BADGE_STYLE: Record<HeroSlide['badgeBg'], React.CSSProperties> = {
  mandarin: { background: 'var(--mandarin)', color: '#fff' },
  lime: { background: 'var(--lime)', color: 'var(--ink)' },
  pink: { background: 'var(--pink)', color: '#fff' },
  blue: { background: 'var(--blue)', color: '#fff' },
};

/**
 * The hero carousel — a stack of polaroids, not a slideshow. The incoming card
 * drops onto the pile with a tilt while the old one still peeks from underneath,
 * every photo slowly Ken-Burns-drifts while it holds, the corner sticker POPS with
 * each new scene and the story-style progress pills tell the eye something is
 * about to happen. Pauses on hover/touch, swipes on mobile, and with
 * prefers-reduced-motion it degrades to a calm crossfade.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0); // remounts the progress fill so it restarts
  const touchX = useRef<number | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const go = useCallback(
    (next: number) => {
      setIdx((cur) => {
        const n = (next + slides.length) % slides.length;
        if (n !== cur) setPrev(cur);
        return n;
      });
      setCycle((c) => c + 1);
    },
    [slides.length],
  );

  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => go(idx + 1), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [idx, paused, cycle, go]);

  // the old card lingers under the new one just long enough for the drop to read
  useEffect(() => {
    if (prev === null) return;
    const t = window.setTimeout(() => setPrev(null), 700);
    return () => window.clearTimeout(t);
  }, [prev, idx]);

  const slide = slides[idx]!;

  return (
    <figure
      className="relative m-0 rv"
      style={{ '--d': '.18s' } as React.CSSProperties}
      data-testid="hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]!.clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0]!.clientX - (touchX.current ?? 0);
        if (Math.abs(dx) > 45) go(idx + (dx < 0 ? 1 : -1));
        touchX.current = null;
        setPaused(false);
      }}
    >
      <div className="relative" style={{ aspectRatio: '3/2' }}>
        {/* the card underneath — still visible while the new one drops in */}
        {prev !== null && (
          <div
            key={`under-${prev}-${cycle}`}
            className="absolute inset-0 rounded-[22px] bg-white p-2.5 b2 sh"
            style={{ transform: 'rotate(1.6deg) scale(.985)', zIndex: 1 }}
            aria-hidden
          >
            <div className="h-full w-full overflow-hidden rounded-[14px] border-2 border-ink bg-cream">
              <Image
                src={slides[prev]!.src}
                alt=""
                width={1200}
                height={800}
                sizes="(max-width: 1024px) 100vw, 560px"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* the top card: drops in with a tilt, then the photo drifts (Ken Burns) */}
        <div
          key={`top-${idx}-${cycle}`}
          className={`absolute inset-0 rounded-[22px] bg-white p-2.5 b2 sh ${reduced.current ? 'hero-fade' : 'hero-drop'}`}
          style={{ transform: 'rotate(-1.1deg)', zIndex: 2 }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-[14px] border-2 border-ink bg-cream">
            <Image
              src={slide.src}
              alt={slide.cap}
              width={1200}
              height={800}
              priority={idx === 0}
              sizes="(max-width: 1024px) 100vw, 560px"
              className={`h-full w-full object-cover ${reduced.current ? '' : 'hero-kenburns'}`}
            />
            {/* the sticker pops with every scene */}
            <span
              key={`badge-${idx}-${cycle}`}
              className="stkr pop absolute left-3 top-3 z-10 text-[11px]"
              style={{ ...BADGE_STYLE[slide.badgeBg], '--d': '.35s', '--rot': '-5deg' } as React.CSSProperties}
            >
              <Sparkle s={11} c="currentColor" />
              {slide.badge}
            </span>
          </div>
        </div>
      </div>

      {/* story-style progress pills: the filling bar tells the eye a change is coming */}
      <div className="mt-3 flex items-center gap-1.5 px-1" role="tablist" aria-label="Slides">
        {slides.map((s, i) => (
          <button
            key={s.src}
            type="button"
            role="tab"
            aria-selected={i === idx}
            aria-label={s.badge}
            onClick={() => go(i)}
            className="h-[10px] flex-1 overflow-hidden rounded-full border-2 border-ink bg-white"
            data-testid={`hero-dot-${i}`}
          >
            <span
              key={`fill-${idx}-${cycle}`}
              className="block h-full rounded-full"
              style={{
                background: 'var(--lime)',
                width: i < idx ? '100%' : i > idx ? '0%' : undefined,
                animation:
                  i === idx && !paused && !reduced.current
                    ? `heroFill ${HOLD_MS}ms linear forwards`
                    : undefined,
                ...(i === idx && (paused || reduced.current) ? { width: '100%' } : {}),
              }}
            />
          </button>
        ))}
      </div>

      <figcaption key={`cap-${idx}`} className="hero-cap-in mt-2 px-1 text-[12px] leading-snug opacity-60">
        {slide.cap}
      </figcaption>
    </figure>
  );
}

'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkle } from '@/components/icons';

export type HeroSlide = {
  src: string;
  /** the sticker that pops in the frame's corner */
  badge: string;
  /** sticker colour rotation keeps the wall from looking stamped */
  badgeBg: 'mandarin' | 'lime' | 'pink' | 'blue';
  /** where the figurines live — keeps them in frame when a phone crops the sides */
  pos?: string;
};

const HOLD_MS = 4600;

const BADGE_STYLE: Record<HeroSlide['badgeBg'], React.CSSProperties> = {
  mandarin: { background: 'var(--mandarin)', color: '#fff' },
  lime: { background: 'var(--lime)', color: 'var(--ink)' },
  pink: { background: 'var(--pink)', color: '#fff' },
  blue: { background: 'var(--blue)', color: '#fff' },
};

/**
 * The FULL-BLEED hero carousel. Edge to edge: each scene drops onto the previous
 * one with a settle, then slowly Ken-Burns-drifts while it holds; the corner
 * sticker pops per scene and the story-style progress pills fill toward the next
 * drop. Pauses on hover/touch, swipes on mobile, and under prefers-reduced-motion
 * it degrades to a calm crossfade. The hero copy card is layered on top by the
 * page — the carousel only owns the pictures.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0); // remounts animations so they restart
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

  // the old frame lingers under the new one just long enough for the drop to read
  useEffect(() => {
    if (prev === null) return;
    const t = window.setTimeout(() => setPrev(null), 700);
    return () => window.clearTimeout(t);
  }, [prev, idx]);

  const slide = slides[idx]!;

  return (
    <div
      className="relative h-[48vh] min-h-[340px] w-full overflow-hidden bg-cream lg:h-auto lg:min-h-0 lg:max-h-[680px] lg:aspect-[2.35/1]"
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
      {/* the frame underneath — still visible while the new one drops in */}
      {prev !== null && (
        <div key={`under-${prev}-${cycle}`} className="absolute inset-0" style={{ zIndex: 1 }} aria-hidden>
          <Image
            src={slides[prev]!.src}
            alt=""
            fill
            quality={90}
            sizes="100vw"
            className="object-cover" style={{ objectPosition: slides[prev]!.pos ?? 'center' }}
          />
        </div>
      )}

      {/* the top frame: settles in, then the photo drifts (Ken Burns) */}
      <div
        key={`top-${idx}-${cycle}`}
        className={`absolute inset-0 ${reduced.current ? 'hero-fade' : 'hero-drop-bleed'}`}
        style={{ zIndex: 2 }}
      >
        <Image
          src={slide.src}
          alt={slide.badge}
          fill
          priority={idx === 0}
          quality={90}
          sizes="100vw"
          className={`object-cover ${reduced.current ? '' : 'hero-kenburns'}`}
          style={{ objectPosition: slide.pos ?? 'center' }}
        />
      </div>

      {/* the sticker pops with every scene */}
      <span
        key={`badge-${idx}-${cycle}`}
        className="stkr pop absolute right-4 top-4 z-10 text-[12px] sm:right-6 sm:top-6 sm:text-[13.5px]"
        style={{ ...BADGE_STYLE[slide.badgeBg], '--d': '.35s', '--rot': '4deg' } as React.CSSProperties}
      >
        <Sparkle s={13} c="currentColor" />
        {slide.badge}
      </span>

      {/* story-style progress pills over the photo */}
      <div
        className="absolute bottom-4 left-1/2 z-10 flex w-[min(340px,70%)] -translate-x-1/2 items-center gap-1.5 lg:left-auto lg:right-8 lg:translate-x-0"
        role="tablist"
        aria-label="Slides"
      >
        {slides.map((s, i) => (
          <button
            key={s.src}
            type="button"
            role="tab"
            aria-selected={i === idx}
            aria-label={s.badge}
            onClick={() => go(i)}
            className="h-[11px] flex-1 overflow-hidden rounded-full border-2 border-ink bg-white shs"
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
    </div>
  );
}

'use client';

import { useState } from 'react';
import { PlusIcon } from '@/components/icons';

/**
 * The FAQ / details accordion from the approved design.
 *
 * One panel open at a time, and the first one open on arrival — a wall of collapsed
 * rows reads as "nothing here" and nobody clicks it. Clicking the open row closes it,
 * so the reader can always get the whole list back into view.
 *
 * This is a <button> + conditional <p> rather than <details>/<summary>: the native
 * element cannot be driven into single-open behaviour without fighting its own toggle
 * event, and its marker is unstyleable on older Safari.
 */
export function Accordion({
  items,
  idPrefix = 'faq',
}: {
  items: { q: string; a: string }[];
  idPrefix?: string;
}) {
  const [open, setOpen] = useState(0);

  return (
    <div className="mt-9 flex flex-col gap-3">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div
            key={f.q}
            className="overflow-hidden rounded-[16px] bg-white b2 rv"
            style={{ '--d': `${0.04 * i}s`, boxShadow: isOpen ? 'var(--shadow)' : 'var(--shadow-sm)' } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              aria-controls={`${idPrefix}-panel-${i}`}
              data-testid={`${idPrefix}-${i}`}
              className="flex min-h-[54px] w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-cream"
            >
              <span className="font-display text-[15.5px] font-bold leading-snug">{f.q}</span>
              <PlusIcon open={isOpen} />
            </button>
            {isOpen && (
              <p
                id={`${idPrefix}-panel-${i}`}
                className="px-4 pb-4 text-[14.5px] leading-relaxed opacity-75"
                style={{ borderTop: '2px dashed rgba(23,19,26,.15)', paddingTop: '.85rem' }}
              >
                {f.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

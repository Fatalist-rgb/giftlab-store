import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Stars } from '@/components/icons';
import { fitW, type PoseId } from '@/lib/poses';

/**
 * One pose tile. The landing's "Szablony" grid and the PDP's "Other versions" row are
 * the same card, so it lives once: the two differ only in the line under the title and
 * in where the link points.
 */
export function PoseCard({
  pose,
  name,
  note,
  price,
  index = 0,
  rotate = 0,
  testId,
}: {
  pose: { id: PoseId; src: string; w: number; h: number };
  name: string;
  note: string;
  price: string;
  index?: number;
  rotate?: number;
  testId?: string;
}) {
  return (
    <Link
      href={`/product?t=${pose.id}`}
      className="tcard rv"
      style={{ '--rr': `${rotate}deg`, '--d': `${0.05 * index}s` } as React.CSSProperties}
      data-testid={testId ?? `tpl-${pose.id}`}
    >
      <div className="tcard-in flex h-full flex-col rounded-[var(--r-card)] bg-cream p-3 b2 sh sm:p-4">
        <div className="card-fig relative overflow-hidden rounded-[14px] border-2 border-ink bg-white p-3">
          <div style={{ width: fitW(pose) }}>
            <Image
              src={pose.src}
              alt={name}
              width={pose.w}
              height={pose.h}
              sizes="(max-width: 640px) 45vw, 220px"
              className="block h-auto w-full"
              style={{ transform: `rotate(${index % 2 ? 1.5 : -1.5}deg)` }}
            />
          </div>
        </div>
        <h3 className="mt-3 font-display text-[15.5px] font-bold leading-tight sm:text-[17px]">{name}</h3>
        <p className="mt-0.5 text-[12.5px] leading-snug opacity-65">{note}</p>
        <div className="mt-3 flex items-center justify-between pt-2.5" style={{ borderTop: '2px dashed rgba(23,19,26,.18)' }}>
          <span className="font-display text-[15px] font-extrabold">{price}</span>
          <Stars n={4.8} s={11} />
        </div>
      </div>
    </Link>
  );
}

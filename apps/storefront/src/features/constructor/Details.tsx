import { getTranslations } from 'next-intl/server';
import { Accordion } from '@/components/Accordion';
import { PoseCard } from '@/components/PoseCard';
import { POSES, type PoseId } from '@/lib/poses';

/** Material, shipping, care — the three questions asked after the design is done. */
export async function Details() {
  const t = await getTranslations('product');
  const items = [1, 2, 3].map((i) => ({ q: t(`det${i}Q`), a: t(`det${i}A`) }));

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="text-center font-display text-[26px] font-extrabold sm:text-[32px]">{t('detTitle')}</h2>
      <Accordion items={items} idPrefix="det" />
    </section>
  );
}

/**
 * Other poses of the SAME product. One price across all six, so the card shows a flat
 * "79 zł" — no "from", no size caveat, nothing to un-learn at checkout.
 */
export async function Similar({ current }: { current?: PoseId }) {
  const t = await getTranslations('product');
  const others = POSES.filter((p) => p.id !== (current ?? 'stoi')).slice(0, 3);
  const rot = [-1.6, 1.3, -1.1];

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="text-center font-display text-[26px] font-extrabold sm:text-[32px]">{t('simTitle')}</h2>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
        {others.map((p, i) => (
          <PoseCard
            key={p.id}
            pose={p}
            index={i}
            rotate={rot[i]!}
            name={t(`pose.${p.id}`)}
            note={t('simD')}
            price="79 zł"
            testId={`sim-${p.id}`}
          />
        ))}
      </div>
    </section>
  );
}

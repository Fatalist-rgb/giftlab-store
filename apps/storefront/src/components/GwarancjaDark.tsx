import { getTranslations } from 'next-intl/server';
import { IcoApprove, IcoNoReturn, IcoRefund } from '@/components/icons';

/**
 * The three promises on ink — the full-width section from the approved design. One
 * component, because it appears on the landing AND on the product page and the two
 * must never drift: it is the counterweight to the withdrawal exclusion, so it has to
 * say exactly the same thing wherever the buyer meets it.
 */
export async function GwarancjaDark() {
  const t = await getTranslations('home');
  const gwIco = [IcoApprove, IcoRefund, IcoNoReturn];

  return (
    <section style={{ background: 'var(--ink)' }}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-[4.5rem]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[28px] font-extrabold leading-tight text-white rv sm:text-[35px]">
            {t('gwTitle')}
          </h2>
          <p className="mt-3 text-[15.5px] text-white/65 rv" style={{ '--d': '.06s' } as React.CSSProperties}>
            {t('gwSub')}
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {gwIco.map((I, i) => (
            <div
              key={i}
              className="rounded-[var(--r-card)] bg-white p-5 b2 rv"
              style={{ '--d': `${0.06 * i}s`, boxShadow: '4px 5px 0 rgba(255,255,255,.22)' } as React.CSSProperties}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[13px] border-2 border-ink bg-lime shs">
                <I />
              </div>
              <h3 className="mt-3.5 font-display text-[16.5px] font-bold leading-tight">{t(`gw${i + 1}T`)}</h3>
              <p className="mt-1.5 text-[14px] leading-snug opacity-70">{t(`gw${i + 1}D`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

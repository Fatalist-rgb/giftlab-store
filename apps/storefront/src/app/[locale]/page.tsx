import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Accordion } from '@/components/Accordion';
import { PoseCard } from '@/components/PoseCard';
import { PayMarks } from '@/components/PayMarks';
import { Reviews } from '@/features/reviews/Reviews';
import { POSES, type PoseId } from '@/lib/poses';
import { GwarancjaDark } from '@/components/GwarancjaDark';
import { HeroCarousel } from '@/components/HeroCarousel';
import {
  ArrowR, Burst, Heart, IcoBox, IcoChar, IcoClock, IcoCut, IcoName,
  IcoPay, IcoTruck, SecHead, Sparkle,
} from '@/components/icons';

/**
 * The landing, section for section as the client approved it on the demo.
 *
 * Order matters and is not arbitrary: the object first (hero photo), then how it is
 * made, then proof it exists, then what you can pick, then the price, then other
 * people, then the promises, then the objections. Anything that asks for money sits
 * after something that earned it.
 *
 * Everything here is a server component. The only interactive piece is the FAQ
 * accordion, so that is the only thing shipped as client JS.
 */

/* Our own occasion scenes — the product in each setting, no stock photography.
   Anniversary and parents' day show COUPLES so the page isn't one face repeated. */
const OCCASION_PHOTO = [
  '/photos/ok-urodziny.webp',
  '/photos/ok-rocznica-para.webp',
  '/photos/ok-rodzice-para.webp',
  '/photos/ok-bez.webp',
];

/* The wall mixes our product photography (one frame is a real phone shot of the
   physical magnet) with three poses, exactly as the design does. The handles and
   like counts are PLACEHOLDERS until real tagged posts exist — they are strings
   in the message catalogue so they can be swapped without a deploy. */
const UGC: { photo?: string; pose?: PoseId; user: string; likes: string; rot: number; viral?: boolean }[] = [
  { photo: '/photos/ugc-couple-shelf.webp', user: '@kasia.w', likes: '1,2k', rot: -1.8 },
  { pose: 'kieszen', user: '@michal_p', likes: '870', rot: 1.5 },
  { photo: '/photos/scene-hand-sq.webp', user: '@ola.i.kuba', likes: '3,4k', rot: -1.2, viral: true },
  { pose: 'lezy', user: '@burek.official', likes: '2,1k', rot: 1.8 },
  { photo: '/photos/ugc-woman-gift.webp', user: '@lucy.golden', likes: '640', rot: -1.5 },
  { pose: 'kufel', user: '@gosia.k', likes: '1,5k', rot: 1.2 },
];

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  const steps = [IcoChar, IcoCut, IcoName, IcoBox];
  const stepRot = [-2.2, 1.6, -1.4, 2.2];
  const stepBg = ['var(--lime)', '#fff', '#fff', 'var(--lime)'];
  const real = ['/photos/made-face.webp', '/photos/made-belly.webp', '/photos/scene-fridge-sq.webp'];
  const realRot = [-1.8, 1.5, -1.2];
  const tplRot = [-1.6, 1.4, -1.2, 1.8];
  const bulkRows = [
    [t('bulk1'), '79 zł', ''],
    [t('bulk3'), '65 zł', t('bulkEach')],
    [t('bulk6'), '49 zł', t('bulkEach')],
  ];
  const bulkRot = [-1.8, 1.5, 1];
  const faqs = [1, 2, 3, 4, 5].map((i) => ({ q: t(`q${i}Q`), a: t(`q${i}A`) }));

  return (
    <main>
      {/* ---- hero: the FULL-WIDTH carousel IS the hero — no copy card on top (the
             client's call: nothing may cover the figurines). The page keeps its H1
             for search engines and screen readers only. ---- */}
      <section className="relative" style={{ borderBottom: 'var(--border)' }}>
        <h1 className="sr-only">{t('title')}</h1>
        <HeroCarousel
          slides={[
            { src: '/photos/hero-crew.webp', badge: t('hs1b'), badgeBg: 'mandarin' },
            { src: '/photos/hero-fridge.webp', badge: t('heroPhotoBadge'), badgeBg: 'lime' },
            { src: '/photos/hero-worktop.webp', badge: t('hs5b'), badgeBg: 'blue' },
            { src: '/photos/hero-rocznica.webp', badge: t('hs2b'), badgeBg: 'pink' },
            { src: '/photos/hero-rodzice.webp', badge: t('hs3b'), badgeBg: 'mandarin' },
          ]}
        />
      </section>

      {/* the ticker: pure decoration, and it stops for reduced motion */}
      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[0, 1].map((i) => (
            <span key={i} className="flex shrink-0 items-center">
              <span className="whitespace-nowrap px-5 py-3 font-display text-[15px] font-extrabold uppercase tracking-wide sm:text-[17px]">
                {t('marquee')}
              </span>
              <Burst s={13} c="var(--mandarin)" />
            </span>
          ))}
        </div>
      </div>

      {/* ---- how it works: four steps ---- */}
      <section id="jak" className="bg-cream" style={{ borderTop: 'var(--border)', borderBottom: 'var(--border)' }}>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <SecHead title={t('howTitle')} sub={t('howSub')} />
          <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((I, i) => (
              <div key={i} className="rv" style={{ '--d': `${0.06 * i}s` } as React.CSSProperties}>
                <div className="relative h-full rounded-[var(--r-card)] bg-white p-5 b2 sh" style={{ transform: `rotate(${stepRot[i]}deg)` }}>
                  <div className="flex h-14 w-14 items-center justify-center rounded-[14px] border-2 border-ink shs" style={{ background: stepBg[i] }}>
                    <I />
                  </div>
                  <span className="absolute right-5 top-4 font-display text-[13px] font-extrabold opacity-30">0{i + 1}</span>
                  <h3 className="mt-4 font-display text-[18px] font-bold leading-tight">{t(`s${i + 1}Title`)}</h3>
                  <p className="mt-2 text-[14.5px] leading-snug opacity-70">{t(`s${i + 1}Body`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- the finished thing, photographed. Shares Jak's cream on purpose: "how it
             works" and "how it really looks" are one thought, and a second 2.5px rule
             between them would draw a 5px seam ---- */}
      <section id="realne" className="bg-cream" style={{ borderBottom: 'var(--border)' }}>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <SecHead title={t('realTitle')} sub={t('realSub')} />
          <div className="mt-5 flex justify-center">
            <span className="stkr bg-lime text-[12px] rv" style={{ '--d': '.1s', transform: 'rotate(-1.5deg)' } as React.CSSProperties}>
              <Burst s={12} c="var(--ink)" />
              {t('realBadge')}
            </span>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {real.map((src, i) => (
              <figure key={src} className="m-0 rv" style={{ '--d': `${0.07 * i}s` } as React.CSSProperties}>
                <div className="flex h-full flex-col rounded-[var(--r-card)] bg-white p-3 b2 sh" style={{ transform: `rotate(${realRot[i]}deg)` }}>
                  <div className="overflow-hidden rounded-[14px] border-2 border-ink bg-cream" style={{ aspectRatio: '1' }}>
                    <Image
                      src={src}
                      alt={t(`r${i + 1}a`)}
                      width={600}
                      height={600}
                      sizes="(max-width: 640px) 100vw, 360px"
                      data-testid={`real-img-${i}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <figcaption className="mt-3.5 px-1 pb-1">
                    <h3 className="font-display text-[17.5px] font-bold leading-tight">{t(`r${i + 1}`)}</h3>
                    <p className="mt-1.5 text-[14px] leading-snug opacity-70">{t(`r${i + 1}d`)}</p>
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---- templates: six poses, one price ---- */}
      <section id="szablony" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <SecHead title={t('szabTitle')} sub={t('szabSub')} />
        <div className="mt-11 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
          {POSES.map((p, i) => (
            <PoseCard
              key={p.id}
              pose={p}
              index={i}
              rotate={tplRot[i % tplRot.length]!}
              name={t(`pose.${p.id}`)}
              note={t('szabCardD')}
              price="79 zł"
            />
          ))}
        </div>
      </section>

      {/* ---- the quantity ladder ---- */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:pb-20">
        <div className="relative overflow-hidden rounded-[26px] p-6 b2 sh rv sm:p-9" style={{ background: 'var(--blue)' }}>
          <Sparkle className="absolute right-6 top-5 opacity-70" s={26} c="var(--lime)" />
          <div className="relative z-10 grid items-center gap-7 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-display text-[27px] font-extrabold leading-tight text-white sm:text-[34px]">{t('bulkTitle')}</h2>
              <p className="mt-2.5 max-w-[46ch] text-[15px] text-white/85">{t('bulkSub')}</p>
              <span className="stkr mt-4 bg-lime text-[12.5px]" style={{ transform: 'rotate(-1.5deg)' }}>
                <Burst s={13} c="var(--ink)" />
                {t('bulkDiff')}
              </span>
            </div>
            <div className="flex w-full flex-col gap-2.5 lg:w-auto">
              <div className="flex gap-2.5">
                {bulkRows.map(([qty, price, each], i) => (
                  <div
                    key={qty}
                    className="flex-1 rounded-[16px] bg-white px-2 py-3 text-center b2 lg:w-[104px]"
                    style={{ boxShadow: 'var(--shadow-sm)', transform: `rotate(${bulkRot[i]}deg)` }}
                  >
                    <p className="text-[11.5px] font-semibold uppercase tracking-wide opacity-55">{qty}</p>
                    <p className="mt-0.5 font-display text-[21px] font-extrabold leading-none">{price}</p>
                    <p className="mt-0.5 h-[13px] text-[10.5px] opacity-55">{each}</p>
                  </div>
                ))}
              </div>
              <Link href="/product" className="btn-p mt-1 w-full text-[15px]" style={{ background: 'var(--ink)' }}>
                {t('bulkCta')}
                <ArrowR s={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- the wall ---- */}
      <section className="bg-cream" style={{ borderTop: 'var(--border)', borderBottom: 'var(--border)' }}>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <SecHead title={t('ugcTitle')} sub={t('ugcSub')} />
          <div className="mt-11 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3">
            {UGC.map((x, i) => {
              const pose = x.pose ? POSES.find((p) => p.id === x.pose)! : null;
              return (
                <div
                  key={x.user}
                  className="ugc-t rv"
                  style={{ '--rr': `${x.rot}deg`, '--d': `${0.04 * i}s`, transform: `rotate(${x.rot}deg)` } as React.CSSProperties}
                >
                  <div className="flex h-full flex-col rounded-[18px] bg-white p-2.5 b2 sh">
                    <div className="relative overflow-hidden rounded-[12px] border-2 border-ink bg-cream" style={{ aspectRatio: '1' }}>
                      {pose ? (
                        <div className="flex h-full w-full items-center justify-center p-2">
                          <div style={{ width: `min(74%, calc(100% * ${pose.w} / ${pose.h}))` }}>
                            <Image src={pose.src} alt="" width={pose.w} height={pose.h} sizes="(max-width: 768px) 45vw, 240px" className="block h-auto w-full" />
                          </div>
                        </div>
                      ) : (
                        <Image src={x.photo!} alt="" width={700} height={700} sizes="(max-width: 768px) 45vw, 300px" className="h-full w-full object-cover" />
                      )}
                      {x.viral && (
                        <span className="stkr pop absolute left-2 top-2 z-10 bg-lime text-[10px]" style={{ '--d': '.5s', '--rot': '-6deg' } as React.CSSProperties}>
                          <Burst s={11} c="var(--ink)" />
                          {t('badgeViral')}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between px-0.5">
                      <span className="truncate text-[12px] font-semibold">{x.user}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[12px] opacity-70">
                        <Heart s={12} />
                        {x.likes}
                      </span>
                    </div>
                    <p className="truncate px-0.5 text-[11.5px] leading-snug opacity-55">{t(`ugc${i + 1}`)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* real reviews from the reviews module — never invented ones */}
      <Reviews />

      {/* ---- the three promises, on ink ---- */}
      <GwarancjaDark />

      {/* ---- occasions ---- */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <SecHead title={t('okTitle')} sub={t('okSub')} />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {OCCASION_PHOTO.map((src, i) => (
            <Link
              key={src}
              href="/product"
              className="tcard rv"
              style={{ '--rr': `${tplRot[i]}deg`, '--d': `${0.05 * i}s` } as React.CSSProperties}
              data-testid={`ok-${i}`}
            >
              <div className="tcard-in relative overflow-hidden rounded-[var(--r-card)] b2 sh" style={{ aspectRatio: '4/3' }}>
                <Image src={src} alt="" width={560} height={420} sizes="(max-width: 640px) 45vw, 280px" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(23,19,26,0) 38%,rgba(23,19,26,.78) 100%)' }} />
                <span className="absolute bottom-3 left-3.5 right-3 font-display text-[15px] font-extrabold leading-tight text-white sm:text-[17px]">
                  {t(`ok${i + 1}`)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- the three facts a buyer checks before paying ---- */}
      <section className="bg-cream" style={{ borderTop: 'var(--border)', borderBottom: 'var(--border)' }}>
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-11 md:grid-cols-3">
          <div className="rv">
            <div className="flex items-center gap-2.5">
              <IcoPay />
              <h3 className="font-display text-[16px] font-bold">{t('trustPay')}</h3>
            </div>
            <p className="mt-1.5 text-[13.5px] opacity-65">{t('trustPayD')}</p>
            <PayMarks className="mt-2.5 flex flex-wrap items-center gap-1.5" />
          </div>
          <div className="rv" style={{ '--d': '.06s' } as React.CSSProperties}>
            <div className="flex items-center gap-2.5">
              <IcoClock />
              <h3 className="font-display text-[16px] font-bold">{t('trustShip')}</h3>
            </div>
            <p className="mt-1.5 text-[13.5px] opacity-65">{t('trustShipD')}</p>
          </div>
          <div className="rv" style={{ '--d': '.12s' } as React.CSSProperties}>
            <div className="flex items-center gap-2.5">
              <IcoTruck />
              <h3 className="font-display text-[16px] font-bold">{t('trustFree')}</h3>
            </div>
            <p className="mt-1.5 text-[13.5px] opacity-65">{t('trustFreeD')}</p>
          </div>
        </div>
      </section>

      {/* ---- objections ---- */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <SecHead title={t('faqTitle')} />
        <Accordion items={faqs} />
      </section>

      {/* ---- and the ask ---- */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="relative overflow-hidden rounded-[26px] bg-mandarin px-6 py-11 text-center b2 sh rv sm:py-14">
          <Sparkle className="absolute left-7 top-6 opacity-80" s={24} c="var(--lime)" />
          <Sparkle className="absolute bottom-6 right-8 opacity-80" s={20} c="#fff" />
          <h2 className="relative z-10 font-display text-[29px] font-extrabold leading-tight text-white sm:text-[40px]">{t('ctaTitle')}</h2>
          <p className="relative z-10 mt-3 text-[16px] text-white/90">{t('ctaSub')}</p>
          <Link href="/product" className="btn-p relative z-10 mt-7 px-7 text-[16px]" style={{ background: 'var(--ink)' }}>
            {t('cta')}
            <ArrowR />
          </Link>
        </div>
      </section>
    </main>
  );
}

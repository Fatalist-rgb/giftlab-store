/**
 * The demo's icon set, ported verbatim.
 *
 * All hand-drawn line SVG on purpose: emoji render differently on every OS and would
 * break the one look the shop has. Everything here is a pure function of its props, so
 * these stay server components and cost no JS on the client.
 */

export const Sparkle = ({ s = 18, c = 'var(--mandarin)', className = '', style }: {
  s?: number; c?: string; className?: string; style?: React.CSSProperties;
}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
    <g stroke={c} strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5M4.9 4.9l3.5 3.5M15.6 15.6l3.5 3.5M19.1 4.9l-3.5 3.5M8.4 15.6l-3.5 3.5" />
    </g>
  </svg>
);

export const Burst = ({ s = 14, c = 'var(--ink)' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 1.8l2.5 5.4 5.9-1.4-2.9 5.3 4.7 3.7-5.9 1.1.4 6-5-3.4-5 3.4.4-6-5.9-1.1 4.7-3.7-2.9-5.3 5.9 1.4z"
      fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round"
    />
  </svg>
);

/* Half stars need a gradient, and a gradient needs an id that is unique per size —
   two <defs> sharing an id would make every star on the page render the first one. */
const Star = ({ f = true, h = false, s = 16 }: { f?: boolean; h?: boolean; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true">
    <defs>
      <linearGradient id={'glHalf' + s}>
        <stop offset="50%" stopColor="var(--mandarin)" />
        <stop offset="50%" stopColor="#fff" />
      </linearGradient>
    </defs>
    <path
      d="M12 2.8l2.8 5.7 6.3 1-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-1z"
      fill={h ? `url(#glHalf${s})` : f ? 'var(--mandarin)' : '#fff'}
      stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round"
    />
  </svg>
);

export const Stars = ({ n = 5, s = 16 }: { n?: number; s?: number }) => (
  <span className="inline-flex gap-[3px]" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => (
      <Star key={i} f={i < Math.floor(n)} h={i === Math.floor(n) && n % 1 >= 0.3} s={s} />
    ))}
  </span>
);

export const Heart = ({ s = 14, c = 'var(--pink)' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 20.5C5.6 16 2.5 12.6 2.5 8.9 2.5 6 4.8 3.8 7.6 3.8c1.8 0 3.4.9 4.4 2.4 1-1.5 2.6-2.4 4.4-2.4 2.8 0 5.1 2.2 5.1 5.1 0 3.7-3.1 7.1-9.5 11.6z"
      fill={c} stroke="var(--ink)" strokeWidth="1.5"
    />
  </svg>
);

/* ---- the four how-it-works steps ---- */
const stepSvg = { width: 32, height: 32, viewBox: '0 0 32 32', fill: 'none', stroke: 'var(--ink)', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const IcoChar = () => (
  <svg {...stepSvg}>
    <circle cx="16" cy="8.5" r="4.6" />
    <path d="M16 14.4c-4.3 0-6.3 2.7-6.9 6.1-.5 3 .6 6.9 6.9 6.9s7.4-3.9 6.9-6.9c-.6-3.4-2.6-6.1-6.9-6.1z" />
    <path d="M8.2 19.5l-2.6 1.9M23.8 19.5l2.6 1.9" />
  </svg>
);
export const IcoCut = () => (
  <svg {...stepSvg}>
    <path d="M4.5 6.5h23v12.5h-23z" strokeDasharray="3 2.6" />
    <circle cx="16" cy="12" r="4.4" />
    <path d="M9 26.5c1.9-3.1 4.1-4.6 7-4.6s5.1 1.5 7 4.6" />
  </svg>
);
export const IcoName = () => (
  <svg {...stepSvg}>
    <path d="M5 22.5l1.4-4.7L19.6 4.6a2.4 2.4 0 0 1 3.4 3.4L9.8 21.1z" />
    <path d="M17.6 6.8l3.4 3.4M4.5 28h23" />
  </svg>
);
export const IcoBox = () => (
  <svg {...stepSvg}>
    <path d="M4.5 10.2L16 4.6l11.5 5.6v11.6L16 27.4 4.5 21.8z" />
    <path d="M4.5 10.2L16 15.8l11.5-5.6M16 15.8v11.6" />
  </svg>
);

/* ---- the three guarantees ---- */
const gwSvg = { width: 30, height: 30, viewBox: '0 0 32 32', fill: 'none', stroke: 'var(--ink)', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const IcoApprove = () => (
  <svg {...gwSvg}>
    <path d="M6 4.5h14l6 6v17H6z" /><path d="M19.5 4.6v6.4h6.3" /><path d="M10.5 19.2l3.2 3.2 7-7.4" />
  </svg>
);
export const IcoRefund = () => (
  <svg {...gwSvg}>
    <circle cx="16" cy="16" r="11.5" />
    <path d="M20 12.2h-5.2a2.6 2.6 0 0 0 0 5.2h2.4a2.6 2.6 0 0 1 0 5.2H12M16 9.4v2.8M16 19.8v2.8" />
  </svg>
);
export const IcoNoReturn = () => (
  <svg {...gwSvg}>
    <path d="M4.5 11.5h16v11h-16z" /><path d="M20.5 14.6h4.4l3 3.6v4.3h-7.4z" />
    <circle cx="9.2" cy="24.6" r="2.4" /><circle cx="23" cy="24.6" r="2.4" /><path d="M27 5L18.5 13.5M18.5 5L27 13.5" />
  </svg>
);

/* ---- the trust strip ---- */
const trustSvg = { width: 28, height: 28, viewBox: '0 0 32 32', fill: 'none', stroke: 'var(--ink)', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const IcoPay = () => (
  <svg {...trustSvg}><rect x="3.5" y="7" width="25" height="18" rx="3" /><path d="M3.5 12.8h25M7.5 19.6h5" /></svg>
);
export const IcoClock = () => (
  <svg {...trustSvg}><circle cx="16" cy="16" r="11.6" /><path d="M16 8.8V16l4.8 2.9" /></svg>
);
export const IcoTruck = () => (
  <svg {...trustSvg}>
    <path d="M3.5 7.5h15v13h-15z" /><path d="M18.5 12h5.6l3.9 4.5v4h-9.5z" />
    <circle cx="8.6" cy="23.5" r="2.5" /><circle cx="22.4" cy="23.5" r="2.5" />
  </svg>
);

/* ---- social ---- */
const socSvg = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const IconIg = () => (
  <svg {...socSvg}>
    <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.3" cy="6.8" r="1.15" fill="currentColor" stroke="none" />
  </svg>
);
export const IconTt = () => (
  <svg {...socSvg}>
    <path d="M14.5 3.5v10.8a3.9 3.9 0 1 1-3.3-3.85" /><path d="M14.5 5.2c.8 2.2 2.5 3.6 5 3.8" />
  </svg>
);
export const IconFb = () => (
  <svg {...socSvg}>
    <path d="M14.8 4h-2.2a3.4 3.4 0 0 0-3.4 3.4V10H6.8v3.4h2.4V21h3.4v-7.6h2.6l.6-3.4h-3.2V7.7c0-.5.4-.9.9-.9h2.3z" />
  </svg>
);

export const PlusIcon = ({ open }: { open?: boolean }) => (
  <svg
    width="22" height="22" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round"
    style={{ transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s ease', flex: 'none' }}
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const CheckIcon = ({ s = 15 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
);

export const ArrowR = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

/** Section heading — the same two lines above every block on the landing. */
export const SecHead = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="mx-auto max-w-2xl text-center">
    <h2 className="font-display text-[30px] font-extrabold leading-tight sm:text-[38px]">{title}</h2>
    {sub ? <p className="mt-3 text-[16px] opacity-70">{sub}</p> : null}
  </div>
);

'use client';

/**
 * Consent-gated analytics (T061 / art. 399 PKE + RODO). NOTHING loads or fires before
 * the customer grants the analytics category — no scripts, no queued events, no
 * fingerprinting. `track()` is a safe no-op without consent, so feature code can call
 * it unconditionally (T071a funnel events build on this).
 */
export type CookieConsent = {
  analytics: boolean;
  marketing: boolean;
  ts: string;
};

const CONSENT_KEY = 'gl_cookie_consent';
const CID_KEY = 'gl_cid';
const GA_ID = process.env.NEXT_PUBLIC_GA_ID; // unset until the client provides one

export function readConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as CookieConsent) : null;
  } catch {
    return null;
  }
}

/** Anonymous, locally-generated subject id — only ever used AFTER a consent choice. */
export function subjectId(): string {
  let id = localStorage.getItem(CID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CID_KEY, id);
  }
  return id;
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }): CookieConsent {
  const consent: CookieConsent = { ...choice, ts: new Date().toISOString() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  // provability: record the grant on the backend (fire-and-forget)
  const categories = [
    ...(choice.analytics ? ['analytics'] : []),
    ...(choice.marketing ? ['marketing'] : []),
  ];
  void fetch('/api/gl/consent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subjectRef: subjectId(), categories }),
  }).catch(() => {});
  window.dispatchEvent(new CustomEvent('gl:consent', { detail: consent }));
  if (consent.analytics) loadAnalytics();
  return consent;
}

let loaded = false;
/** Inject GA4 only after consent and only when an id is configured. */
export function loadAnalytics(): void {
  if (loaded || !GA_ID) return;
  const consent = readConsent();
  if (!consent?.analytics) return;
  loaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
  const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag(...args: unknown[]) {
    w.dataLayer.push(args);
  };
  w.gtag('js', new Date());
  w.gtag('config', GA_ID, { anonymize_ip: true });
}

/** Funnel event (T071a). Silently dropped without analytics consent. */
export function track(event: string, props: Record<string, unknown> = {}): void {
  const consent = readConsent();
  if (!consent?.analytics) return;
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  if (GA_ID && w.gtag) w.gtag('event', event, props);
  else console.debug('[gl:event]', event, props); // visible in dev until a GA id exists
}

'use client';

/**
 * RUM (T071): Core Web Vitals through the consent-gated `track()` — nothing reports
 * before consent. Ad-platform preload bots (FB/IG/TikTok prefetch the landing before a
 * human sees it) are filtered out so vitals and funnel numbers stay human-only.
 */
import { track } from './analytics';

const BOT_UA = /facebookexternalhit|facebookcatalog|bytespider|tiktok|snapchat|pinterestbot|preload|prerender/i;

export function isPreloadBot(): boolean {
  if (typeof navigator === 'undefined') return true;
  if (BOT_UA.test(navigator.userAgent)) return true;
  // pages rendered but never shown (ad-platform prefetch) report as prerender
  if (document.visibilityState === 'hidden' && !document.prerendering) return false;
  return Boolean(document.prerendering);
}

let started = false;

/** Start CWV reporting once per page load (safe to call repeatedly). */
export function startRum(): void {
  if (started || isPreloadBot()) return;
  started = true;
  void import('web-vitals').then(({ onCLS, onINP, onLCP, onTTFB }) => {
    const report = (metric: { name: string; value: number; rating: string }) => {
      track('web_vital', {
        metric: metric.name,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        rating: metric.rating,
        referrer: document.referrer ? new URL(document.referrer).hostname : 'direct',
      });
    };
    onCLS(report);
    onINP(report);
    onLCP(report);
    onTTFB(report);
  });
}

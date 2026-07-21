'use client';

import { useEffect } from 'react';
import { startRum } from '@/lib/rum';

/** Mount-only hook for Core Web Vitals reporting (consent-gated inside track()). */
export function Rum() {
  useEffect(() => {
    startRum();
  }, []);
  return null;
}

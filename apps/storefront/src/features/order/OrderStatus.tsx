'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createBrowserCutout } from '@/lib/cutout';
import { uploadPhotoWithCutout } from '@/lib/uploads';

type Line = {
  lineItemId: string;
  title: string | null;
  quantity: number;
  renderStatus: string | null;
  needsPhoto: boolean;
};
type Status = { orderId: string; displayId: number | null; lines: Line[] };

const statusTone: Record<string, string> = {
  ready: 'bg-lime',
  queued: 'bg-cream',
  processing: 'bg-cream',
  awaiting_photo: 'bg-orange-100',
  failed: 'bg-red-100',
};

/**
 * Customer order page: line-by-line production status, and — for lines ordered with
 * "I'll send the photo later" — the place where that photo actually gets sent (the
 * customer half of T049). Upload → browser cutout → R2 → attach → render kicks off.
 */
export function OrderStatus({ orderId }: { orderId: string }) {
  const t = useTranslations('order');
  const [status, setStatus] = useState<Status | null>(null);
  const [missing, setMissing] = useState(false);
  const [busyLine, setBusyLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const targetLineRef = useRef<string | null>(null);
  const cutoutRef = useRef(createBrowserCutout());

  const load = useCallback(() => {
    fetch(`/api/gl/order-status?id=${encodeURIComponent(orderId)}`)
      .then(async (r) => (r.ok ? ((await r.json()) as Status) : Promise.reject(new Error(String(r.status)))))
      .then(setStatus)
      .catch(() => setMissing(true));
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  // poll while anything is still rendering
  useEffect(() => {
    if (!status?.lines.some((l) => l.renderStatus === 'queued' || l.renderStatus === 'processing')) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [status, load]);

  const pickPhoto = (lineItemId: string) => {
    targetLineRef.current = lineItemId;
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const lineItemId = targetLineRef.current;
    if (!file || !lineItemId) return;
    setBusyLine(lineItemId);
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const cut = await cutoutRef.current.removeBackground({ imageBytes: bytes, mime: file.type || 'image/png' });
      if (!cut.ok || !cut.imageBytes) throw new Error('cutout failed');
      const blob = new Blob([cut.imageBytes as unknown as BlobPart], { type: 'image/png' });
      const stored = await uploadPhotoWithCutout(file, blob, true);
      if (!stored) throw new Error('upload failed');
      const attach = await fetch('/api/gl/attach-photo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, lineItemId, uploadId: stored.uploadId }),
      });
      if (!attach.ok) throw new Error('attach failed');
      load();
    } catch {
      setError(t('attachError'));
    } finally {
      setBusyLine(null);
    }
  };

  if (missing) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">{t('notFound')}</h1>
      </main>
    );
  }
  if (!status) {
    return <main className="mx-auto max-w-xl px-5 py-16 text-center opacity-60">{t('loading')}</main>;
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <h1 className="font-display text-3xl font-extrabold" data-testid="order-status-title">
        {t('title', { number: status.displayId ?? '—' })}
      </h1>
      <p className="mt-2 text-sm opacity-60">{t('sub')}</p>

      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" data-testid="order-file" />

      <div className="mt-6 space-y-3">
        {status.lines.map((line) => (
          <div key={line.lineItemId} className="rounded-2xl border-2 border-ink bg-white p-4 shadow-offset-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display font-bold">{line.title ?? 'Figurka'}</p>
                <p className="text-sm opacity-60">× {line.quantity}</p>
              </div>
              <span className={`rounded-full border-2 border-ink px-3 py-1 text-xs font-bold ${statusTone[line.renderStatus ?? ''] ?? 'bg-white'}`}>
                {t(`status_${line.renderStatus ?? 'unknown'}`)}
              </span>
            </div>

            {line.needsPhoto && (
              <div className="mt-3 rounded-xl bg-orange-50 p-3">
                <p className="text-sm">{t('needsPhoto')}</p>
                <button
                  onClick={() => pickPhoto(line.lineItemId)}
                  disabled={busyLine === line.lineItemId}
                  data-testid={`attach-${line.lineItemId}`}
                  className="mt-2 rounded-xl border-2 border-ink bg-mandarin px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {busyLine === line.lineItemId ? t('attaching') : t('attachCta')}
                </button>
                <p className="mt-2 text-xs opacity-55">{t('photoConsent')}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-900">{error}</p>}
    </main>
  );
}

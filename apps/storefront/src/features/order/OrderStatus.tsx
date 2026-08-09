'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Guarantee } from '@/components/Guarantee';
import {
  ArrowR, Burst, CheckIcon, IcoClock, IcoTruck, IconFile, IconMail, IconTools, Sparkle, Squiggle,
} from '@/components/icons';
import { DeliveryRow, ItemThumb, itemMeta, zl } from '@/features/cart/bits';
import { createBrowserCutout } from '@/lib/cutout';
import { scanFaces, warmFaceDetector } from '@/lib/face-detect';
import { uploadPhotoWithCutout } from '@/lib/uploads';

type Line = {
  lineItemId: string;
  title: string | null;
  quantity: number;
  unitPrice?: number;
  total?: number;
  pose?: string | null;
  printedName?: string | null;
  renderStatus: string | null;
  needsPhoto: boolean;
};
type Status = {
  orderId: string;
  displayId: number | null;
  email?: string | null;
  itemTotal?: number;
  shippingTotal?: number;
  total?: number;
  shippingName?: string | null;
  lines: Line[];
};

const statusTone: Record<string, string> = {
  ready: 'bg-lime',
  queued: 'bg-cream',
  processing: 'bg-cream',
  awaiting_photo: 'bg-orange-100',
  failed: 'bg-red-100',
};

/**
 * The "thank you" page in the approved design — and the customer's order page at the
 * same time. The hero, the four-step timeline and the receipt come from the demo; the
 * per-line render status and the "send the photo later" upload (T049) stay, folded
 * into the receipt lines, because this page is where that flow completes.
 */
export function OrderStatus({ orderId }: { orderId: string }) {
  const t = useTranslations('order');
  const tc = useTranslations('confirm');
  const tCart = useTranslations('cart');
  const locale = useLocale();
  const [status, setStatus] = useState<Status | null>(null);
  const [missing, setMissing] = useState(false);
  const [busyLine, setBusyLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<{ from: string; to: string } | null>(null);
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

  useEffect(() => {
    fetch('/api/gl/delivery-estimate')
      .then(async (r) => (r.ok ? await r.json() : null))
      .then((d) => d && setDelivery(d))
      .catch(() => {});
  }, []);

  // poll while anything is still rendering
  useEffect(() => {
    if (!status?.lines.some((l) => l.renderStatus === 'queued' || l.renderStatus === 'processing')) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [status, load]);

  const pickPhoto = (lineItemId: string) => {
    targetLineRef.current = lineItemId;
    warmFaceDetector(); // model loads while the customer browses for a file
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
      // one figurine = one face — same guard as the constructor (null = detector off, fail-open)
      const scan = await scanFaces(file);
      if (scan && scan.count > 1) {
        setError(t('multiFace'));
        return;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const cut = await cutoutRef.current.removeBackground({ imageBytes: bytes, mime: file.type || 'image/png' });
      // a failed cutout must not block a paid order: send the photo as-is (the face zone
      // is masked) and let the operator decide — the admin flags such lines
      const blob =
        cut.ok && cut.imageBytes
          ? new Blob([cut.imageBytes as unknown as BlobPart], { type: 'image/png' })
          : null;
      const stored = await uploadPhotoWithCutout(file, blob, true);
      if (!stored) throw new Error('upload failed');
      const attach = await fetch('/api/gl/attach-photo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orderId,
          lineItemId,
          uploadId: stored.uploadId,
          // detected face box lets the backend centre the whole head in the zone
          faceBox: scan?.box ? { ...scan.box, imgW: scan.imgW, imgH: scan.imgH } : undefined,
        }),
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

  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'uk' ? 'uk-UA' : locale === 'en' ? 'en-GB' : 'pl-PL', {
      day: 'numeric',
      month: 'long',
    });
  const range = delivery ? `${fmtDay(delivery.from)} – ${fmtDay(delivery.to)}` : '…';

  const steps = [
    { I: CheckIcon, h: tc('n1H'), d: tc('n1D'), done: true, chip: null as string | null },
    { I: IconFile, h: tc('n2H'), d: tc('n2D'), done: false, chip: tc('n2Chip') },
    { I: IconTools, h: tc('n3H'), d: tc('n3D'), done: false, chip: tc('n3Chip') },
    { I: IcoTruck, h: tc('n4H'), d: tc('n4D', { range }), done: false, chip: null },
  ];
  const rot = [-0.8, 0.6, -0.5, 0.8];

  // totals arrive with the enriched status payload; an older backend omits them and
  // the receipt block simply stays hidden
  const hasTotals = typeof status.total === 'number' && status.total > 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" data-testid="order-file" />

      {/* hero */}
      <div className="text-center">
        <div className="relative inline-flex items-center justify-center" style={{ width: 96, height: 96 }}>
          <span className="absolute inset-0"><Burst s={96} c="var(--lime)" /></span>
          <CheckIcon s={40} />
          <span className="absolute -right-3.5 -top-2.5"><Sparkle s={26} /></span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-5xl" style={{ letterSpacing: '-0.02em' }}>
          {tc('okA')}{' '}
          <span
            className="inline-block bg-lime"
            style={{ border: 'var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: '.05em .35em', transform: 'rotate(-1.5deg)' }}
          >
            {tc('okB')}
          </span>
        </h1>
        {status.email && <p className="mt-4 opacity-70">{tc('okSub', { email: status.email })}</p>}
        <div
          className="mt-6 inline-flex flex-col items-center gap-1 bg-cream px-6 py-4"
          style={{ border: 'var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)', transform: 'rotate(-1deg)' }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider opacity-55">{tc('orderNo')}</span>
          <span className="font-display text-2xl font-extrabold sm:text-3xl" data-testid="order-ok">
            #{status.displayId ?? '—'}
          </span>
        </div>
      </div>

      {/* what happens next */}
      <h2 className="mb-4 mt-12 flex items-center gap-2 font-display text-2xl font-extrabold">
        {tc('nextH')}
        <Squiggle w={70} c="var(--pink)" />
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div
            key={s.h}
            className="flex flex-col rounded-[var(--r-card)] p-4 b2 sh"
            style={{ background: s.done ? 'var(--lime)' : '#fff', transform: `rotate(${rot[i]}deg)` }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border-[2.5px] border-ink shs"
                style={{ background: s.done ? '#fff' : 'var(--cream)' }}
              >
                <s.I />
              </span>
              <span className="font-display text-[12px] font-extrabold opacity-45">{i + 1}/4</span>
              {s.chip && (
                <span className="stkr ml-auto bg-mandarin text-[10px] text-white" style={{ transform: 'rotate(-2deg)' }}>
                  {s.chip}
                </span>
              )}
            </div>
            <h3 className="mb-1 mt-3 font-display text-base font-extrabold">{s.h}</h3>
            <p className="m-0 text-xs leading-relaxed opacity-75">{s.d}</p>
          </div>
        ))}
      </div>

      {/* receipt + guarantee */}
      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
        <section className="rounded-[var(--r-card)] bg-white p-5 b2 sh sm:p-7">
          <h2 className="mb-4 mt-0 flex items-center gap-2 font-display text-xl font-extrabold">
            {tc('sumH')}
            <Sparkle s={17} />
          </h2>
          <div className="flex flex-col gap-4">
            {status.lines.map((line) => (
              <div key={line.lineItemId}>
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <ItemThumb pose={line.pose} size="xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-sm font-bold leading-tight">{tCart('prodName')}</div>
                    <div className="mt-0.5 text-xs opacity-60">{itemMeta(tCart, line)}</div>
                    {typeof line.unitPrice === 'number' && (
                      <div className="text-xs opacity-60">
                        {line.quantity} × {zl(line.unitPrice)}
                      </div>
                    )}
                  </div>
                  {line.renderStatus && (
                    <span className={`shrink-0 rounded-full border-2 border-ink px-2.5 py-0.5 text-[11px] font-bold ${statusTone[line.renderStatus] ?? 'bg-white'}`}>
                      {t(`status_${line.renderStatus}`)}
                    </span>
                  )}
                  {typeof line.total === 'number' && (
                    <b className="shrink-0 font-display text-sm">{zl(line.total)}</b>
                  )}
                </div>
                {line.needsPhoto && (
                  <div className="mt-2 rounded-[14px] border-2 border-ink bg-orange-50 p-3">
                    <p className="m-0 text-sm">{t('needsPhoto')}</p>
                    <button
                      onClick={() => pickPhoto(line.lineItemId)}
                      disabled={busyLine === line.lineItemId}
                      data-testid={`attach-${line.lineItemId}`}
                      className="btn-p mt-2 px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {busyLine === line.lineItemId ? t('attaching') : t('attachCta')}
                    </button>
                    <p className="m-0 mt-2 text-xs opacity-55">{t('photoConsent')}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {hasTotals && (
            <>
              <div className="my-4" style={{ borderTop: '2px dashed rgba(23,19,26,.25)' }} />
              <div className="flex flex-col gap-2 text-[14px]">
                <div className="flex justify-between gap-3">
                  <span>{tc('sumSub')}</span>
                  <b className="font-display">{zl(status.itemTotal ?? 0)}</b>
                </div>
                <div className="flex justify-between gap-3">
                  <span>{tc('sumShip')}</span>
                  <b className="font-display">{zl(status.shippingTotal ?? 0)}</b>
                </div>
              </div>
              <div className="my-3" style={{ borderTop: '2px dashed rgba(23,19,26,.25)' }} />
              <div className="flex items-end justify-between gap-3">
                <span className="font-display text-lg font-bold">{tc('sumTotal')}</span>
                <span className="font-display text-3xl font-extrabold">{zl(status.total ?? 0)}</span>
              </div>
            </>
          )}

          <div className="mt-5 grid gap-3 pt-4 text-sm sm:grid-cols-3" style={{ borderTop: '2px dashed rgba(23,19,26,.25)' }}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide opacity-50">{tc('mPay')}</div>
              <div className="mt-1 inline-flex items-center gap-1.5">
                <IcoClock />
                <b>{tc('payOnline')}</b>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide opacity-50">{tc('mShip')}</div>
              <div className="mt-1 inline-flex items-center gap-1.5">
                <IcoTruck />
                <b>{status.shippingName ?? tCart('shipKurier')}</b>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide opacity-50">{tc('mEmail')}</div>
              <div className="mt-1 inline-flex min-w-0 items-center gap-1.5">
                <IconMail />
                <b className="truncate">{status.email ?? '—'}</b>
              </div>
            </div>
          </div>
          {delivery && (
            <div className="mt-4">
              <DeliveryRow label={tc('delLbl')} from={delivery.from} to={delivery.to} locale={locale} />
            </div>
          )}
          {error && <p className="mt-4 rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-900">{error}</p>}
        </section>

        <div className="flex flex-col gap-5">
          <Guarantee />
          <div className="flex flex-col gap-3">
            <Link href="/" className="btn-p w-full">
              {tc('cta')}
              <ArrowR />
            </Link>
            <Link href="/kontakt" className="btn-s w-full">
              {tc('cta2')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

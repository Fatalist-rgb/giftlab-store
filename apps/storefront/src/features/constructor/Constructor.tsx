'use client';

import {
  buildScene,
  computePrice,
  faceAutoFit,
  renderSceneToCanvas,
  type DesignState,
  type LocalizedText,
  type ProductSchema,
} from '@gl/constructor';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { demoSchema, SAMPLE_FACE_KEY, SAMPLE_PHOTO_ID } from '@/lib/schema';
import { createBrowserCutout } from '@/lib/cutout';
import { scanFaces, warmFaceDetector } from '@/lib/face-detect';
import { uploadPhotoWithCutout } from '@/lib/uploads';
import { track } from '@/lib/analytics';

const PREVIEW_SCALE = 1.2;
const MAX_SLOTS = 6;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

type Adj = { x: number; y: number; scale: number; rotation: number };
const CENTER: Adj = { x: 0, y: 0, scale: 1, rotation: 0 };

/** One figurine being designed — several of these make one order (T042). */
type Slot = {
  variantId: string;
  name: string;
  facePhotoId: string | null;
  adj: Adj;
  quantity: number;
};

type Step = 'character' | 'photo' | 'name' | 'quantity';
const STEPS: Step[] = ['character', 'photo', 'name', 'quantity'];

type CutProgress =
  | { stage: 'idle' }
  | { stage: 'model'; mb: number }
  | { stage: 'cut'; pct: number }
  | { stage: 'error' }
  // the photo shows more than one person — a figurine carries exactly one face
  | { stage: 'multiface'; count: number };

export function Constructor({
  schema: schemaProp,
  productId,
}: { schema?: ProductSchema; productId?: string } = {}) {
  const t = useTranslations('product');
  const tCart = useTranslations('cart');
  const locale = useLocale();
  const schema = schemaProp ?? demoSchema;
  const bodyLayer = schema.characterLayers[0]!;

  const mkSlot = (): Slot => ({
    variantId: bodyLayer.variants[0]!.id,
    name: '',
    facePhotoId: null,
    adj: CENTER,
    quantity: 1,
  });

  const [slots, setSlots] = useState<Slot[]>(() => [mkSlot()]);
  const [active, setActive] = useState(0);
  const [step, setStep] = useState<Step>('character');
  const slot = slots[active]!;
  const patchSlot = (patch: Partial<Slot>, index = active) =>
    setSlots((all) => all.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assetsRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const dragRef = useRef<{ x: number; y: number; base: Adj } | null>(null);
  const retryFileRef = useRef<File | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  const [assetVersion, setAssetVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<CutProgress>({ stage: 'idle' });
  const busy = progress.stage === 'model' || progress.stage === 'cut';

  // cutout with live progress (T040): model download in MB, compute in %
  const cutout = useMemo(
    () =>
      createBrowserCutout((phase, done, total) => {
        if (String(phase).startsWith('fetch')) {
          setProgress((p) => ({
            stage: 'model',
            mb: (p.stage === 'model' ? p.mb : 0) + done / 1_048_576,
          }));
        } else {
          setProgress({ stage: 'cut', pct: total ? Math.round((done / total) * 100) : 0 });
        }
      }),
    [],
  );

  // funnel (T071a)
  useEffect(() => {
    track('constructor_open', { step: 'open' });
  }, []);

  // pre-warm the face detector while the customer is still picking a file
  useEffect(() => {
    if (step === 'photo') warmFaceDetector();
  }, [step]);

  // artwork + mask + sample face, once
  useEffect(() => {
    let alive = true;
    const keys = new Set<string>();
    for (const layer of schema.characterLayers) for (const v of layer.variants) keys.add(v.assetKey);
    keys.add(schema.faceZone.maskAssetKey);
    keys.add(SAMPLE_FACE_KEY);
    Promise.all([...keys].map(async (k) => [k, await loadImage(k)] as const))
      .then((pairs) => {
        if (!alive) return;
        const map = new Map(pairs);
        const sample = map.get(SAMPLE_FACE_KEY);
        if (sample) map.set(SAMPLE_PHOTO_ID, sample);
        assetsRef.current = map;
        setAssetsReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [schema]);

  // upload -> face guard -> browser cutout (with progress) -> face asset -> photo to R2 (async)
  const processFile = async (file: File) => {
    const target = active;
    retryFileRef.current = file;
    setProgress({ stage: 'cut', pct: 0 });
    try {
      // one figurine = one face: photos with several people are rejected up front
      // (fail-open: scan is null when the detector/model is unavailable)
      const scan = await scanFaces(file);
      if (scan && scan.count > 1) {
        track('face_multi_rejected', { step: 'cutout', faces: scan.count });
        setProgress({ stage: 'multiface', count: scan.count });
        return;
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const res = await cutout.removeBackground({ imageBytes: bytes, mime: file.type || 'image/png' });
      if (!res.ok || !res.imageBytes) {
        track('cutout_failed', { step: 'cutout' });
        setProgress({ stage: 'error' });
        return;
      }
      track('face_uploaded', { step: 'cutout' });
      const blob = new Blob([res.imageBytes as unknown as BlobPart], { type: res.mime ?? 'image/png' });
      const img = await loadImage(URL.createObjectURL(blob));
      const localId = `upload-${target}-${Date.now()}`;
      assetsRef.current.set(localId, img);
      // with a detected face, start with the whole head centred in the zone;
      // cover-fit centring (CENTER) otherwise — e.g. pets, drawings
      const initialAdj =
        scan?.box != null
          ? faceAutoFit({
              imgW: scan.imgW,
              imgH: scan.imgH,
              faceBox: scan.box,
              zoneW: schema.faceZone.bounds.w,
              zoneH: schema.faceZone.bounds.h,
              minScale: 0.6,
              maxScale: 2.6,
            })
          : CENTER;
      patchSlot({ facePhotoId: localId, adj: initialAdj }, target);
      setAssetVersion((v) => v + 1);
      setProgress({ stage: 'idle' });

      // persist in the background (uploading = consent by action, see the consent line)
      void uploadPhotoWithCutout(file, blob, true).then((stored) => {
        if (!stored) return; // local preview survives; the order can defer the photo
        assetsRef.current.set(stored.uploadId, img);
        setSlots((all) =>
          all.map((s, i) => (i === target && s.facePhotoId === localId ? { ...s, facePhotoId: stored.uploadId } : s)),
        );
      });
    } catch {
      setProgress({ stage: 'error' });
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void processFile(file);
  };
  const retryCutout = () => {
    const f = retryFileRef.current;
    if (f) void processFile(f);
    else fileRef.current?.click();
  };

  const useSample = () => patchSlot({ facePhotoId: SAMPLE_PHOTO_ID, adj: CENTER });
  const clearFace = () => patchSlot({ facePhotoId: null });

  // designs for ALL slots — the ladder prices the total quantity (FR-012)
  const toDesign = (s: Slot): DesignState => ({
    productSchemaId: schema.id,
    schemaVersion: schema.version,
    characterSelections: { [bodyLayer.id]: s.variantId },
    faceLayer: s.facePhotoId ? { uploadedPhotoId: s.facePhotoId, ...s.adj } : null,
    textValues: s.name.trim() ? [{ fieldId: 'name', value: s.name.trim() }] : [],
    selectedOptions: {},
    quantity: s.quantity,
    photoStatus: s.facePhotoId ? 'ready' : 'deferred',
  });
  const designs = useMemo(() => slots.map(toDesign), [slots, schema.id, schema.version, bodyLayer.id]);
  const activeDesign = designs[active]!;

  // add to cart: every slot's design in ONE cart
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState(false);
  const addToCart = async () => {
    setAdding(true);
    setAdded(false);
    setAddError(false);
    try {
      const res = await fetch('/api/gl/add-to-cart', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ designs, cartId: localStorage.getItem('gl_cart_id'), productId }),
      });
      const body = (await res.json()) as { cartId?: string };
      if (!res.ok || !body.cartId) throw new Error('add-to-cart failed');
      localStorage.setItem('gl_cart_id', body.cartId);
      setAdded(true);
      track('add_to_cart', {
        step: 'add-to-cart',
        designs: slots.length,
        quantity: totalQty,
        personalized: slots.some((s) => s.facePhotoId || s.name.trim()),
      });
    } catch {
      setAddError(true);
    } finally {
      setAdding(false);
    }
  };

  // live preview of the ACTIVE slot — same engine as the print file
  useEffect(() => {
    if (!assetsReady || !canvasRef.current) return;
    const scene = buildScene(schema, activeDesign);
    renderSceneToCanvas(canvasRef.current, scene, {
      schema,
      assets: assetsRef.current,
      scale: PREVIEW_SCALE,
    });
  }, [assetsReady, assetVersion, schema, activeDesign]);

  // drag the face inside its zone
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!slot.facePhotoId) return;
    dragRef.current = { x: e.clientX, y: e.clientY, base: slot.adj };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    const canvas = canvasRef.current;
    if (!d || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pxPerCss = canvas.width / rect.width;
    const dx = ((e.clientX - d.x) * pxPerCss) / PREVIEW_SCALE;
    const dy = ((e.clientY - d.y) * pxPerCss) / PREVIEW_SCALE;
    patchSlot({ adj: { ...d.base, x: d.base.x + dx, y: d.base.y + dy } });
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const price = useMemo(() => computePrice(schema, designs), [schema, designs]);
  const totalQty = designs.reduce((s, d) => s + d.quantity, 0);
  const zl = (grosz: number) => `${Math.round(grosz / 100)} zł`;
  const label = (l?: LocalizedText) => l?.[locale] ?? l?.pl ?? '';

  const stepDone: Record<Step, boolean> = {
    character: true,
    photo: Boolean(slot.facePhotoId),
    name: slot.name.trim().length > 0,
    quantity: true,
  };
  const stepLabel: Record<Step, string> = {
    character: t('character'),
    photo: t('photoStep'),
    name: t('name'),
    quantity: t('quantity'),
  };
  const stepIndex = STEPS.indexOf(step);

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 pb-28 pt-10 lg:grid-cols-2 lg:pb-10">
      {/* live preview (stays visible while steps change — T041) */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative rounded-3xl border-2 border-ink bg-cream p-4 shadow-offset">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`mx-auto block h-auto w-full max-w-[365px] ${slot.facePhotoId ? 'cursor-grab touch-none' : ''}`}
          />
          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-3xl bg-white/85">
              <span className="font-display font-bold">{t('removing')}</span>
              <span className="text-sm opacity-70" data-testid="cut-progress">
                {progress.stage === 'model'
                  ? t('modelDownload', { mb: progress.mb.toFixed(1) })
                  : progress.stage === 'cut'
                    ? `${progress.pct}%`
                    : ''}
              </span>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-xs opacity-55">{t('engine')}</p>
      </div>

      {/* controls */}
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t('title')}</h1>
        <p className="mt-2 text-sm opacity-60">{t('freeNote')}</p>

        {/* figurine slots (T042) — several designs, one order, one ladder */}
        <div className="mt-5 flex flex-wrap items-center gap-2" data-testid="slots">
          {slots.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                setActive(i);
                setStep('character');
              }}
              aria-pressed={i === active}
              data-testid={`slot-${i}`}
              className={`rounded-xl border-2 border-ink px-3 py-1.5 text-sm font-bold ${
                i === active ? 'bg-ink text-white' : 'bg-white'
              }`}
            >
              {t('figurineN', { n: i + 1 })}
              {(s.facePhotoId || s.name.trim()) && <span className="ml-1 text-lime">●</span>}
            </button>
          ))}
          {slots.length < MAX_SLOTS && (
            <button
              onClick={() => {
                setSlots((all) => [...all, mkSlot()]);
                setActive(slots.length);
                setStep('character');
              }}
              data-testid="add-slot"
              className="rounded-xl border-2 border-dashed border-ink px-3 py-1.5 text-sm font-bold opacity-70 hover:opacity-100"
            >
              {t('addFigurine')}
            </button>
          )}
          {slots.length > 1 && (
            <button
              onClick={() => {
                setSlots((all) => all.filter((_, i) => i !== active));
                setActive((a) => Math.max(0, a - 1));
              }}
              aria-label={t('removeFigurine')}
              className="rounded-xl border-2 border-ink bg-white px-2.5 py-1.5 text-sm"
            >
              ✕
            </button>
          )}
        </div>
        {slots.length > 1 && <p className="mt-1 text-xs opacity-55">{t('ladderHint')}</p>}

        {/* step tabs — any tab reachable, completed marked (T041) */}
        <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl border-2 border-ink bg-white p-1" role="tablist">
          {STEPS.map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={step === s}
              data-testid={`step-${s}`}
              onClick={() => setStep(s)}
              className={`rounded-xl px-2 py-2 text-xs font-bold sm:text-sm ${
                step === s ? 'bg-lime shadow-offset-sm' : ''
              }`}
            >
              {stepDone[s] && <span className="mr-1 text-emerald-700">✓</span>}
              {stepLabel[s]}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-[190px]">
          {step === 'character' && (
            <div className="flex flex-wrap gap-2">
              {bodyLayer.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    patchSlot({ variantId: v.id });
                    track('character_chosen', { step: 'character', variant: v.id });
                  }}
                  aria-pressed={slot.variantId === v.id}
                  className={`rounded-xl border-2 border-ink px-4 py-2 text-sm font-bold ${
                    slot.variantId === v.id ? 'bg-lime shadow-offset-sm' : 'bg-white'
                  }`}
                >
                  {label(v.label)}
                </button>
              ))}
            </div>
          )}

          {step === 'photo' && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" data-testid="file" />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border-2 border-ink bg-white px-4 py-2 text-sm font-bold"
                  data-testid="upload"
                >
                  {slot.facePhotoId ? t('swapPhoto') : t('upload')}
                </button>
                <button onClick={useSample} className="rounded-xl border-2 border-ink bg-white px-4 py-2 text-sm font-bold">
                  {t('sample')}
                </button>
                {slot.facePhotoId && (
                  <button onClick={clearFace} className="rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm" aria-label="✕">
                    ✕
                  </button>
                )}
              </div>
              {progress.stage === 'error' && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-red-100 px-3 py-2 text-sm text-red-900" data-testid="cutout-error">
                  <span>{t('cutoutError')}</span>
                  <button onClick={retryCutout} className="font-bold underline underline-offset-2">
                    {t('retry')}
                  </button>
                </div>
              )}
              {progress.stage === 'multiface' && (
                <div className="mt-2 rounded-xl bg-red-100 px-3 py-2 text-sm text-red-900" data-testid="multiface-error">
                  {t('multiFace')}
                </div>
              )}
              {!slot.facePhotoId && <p className="mt-2 text-xs opacity-55">{t('deferred')}</p>}
              <p className="mt-2 text-xs opacity-45">{t('photoConsent')}</p>

              {slot.facePhotoId && (
                <div className="mt-4 rounded-2xl border-2 border-ink bg-white p-4 shadow-offset-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-sm font-bold uppercase tracking-wide opacity-60">{t('adjust')}</p>
                    <button onClick={() => patchSlot({ adj: CENTER })} className="text-xs font-semibold underline">
                      {t('reset')}
                    </button>
                  </div>
                  <label className="mt-3 block text-xs font-semibold opacity-60">
                    {t('scale')}
                    <input
                      type="range"
                      min={0.6}
                      max={2.6}
                      step={0.02}
                      value={slot.adj.scale}
                      data-testid="scale"
                      onChange={(e) => patchSlot({ adj: { ...slot.adj, scale: parseFloat(e.target.value) } })}
                      className="mt-1 w-full"
                    />
                  </label>
                  <label className="mt-2 block text-xs font-semibold opacity-60">
                    {t('rotation')}
                    <input
                      type="range"
                      min={-30}
                      max={30}
                      step={1}
                      value={slot.adj.rotation}
                      data-testid="rotation"
                      onChange={(e) => patchSlot({ adj: { ...slot.adj, rotation: parseFloat(e.target.value) } })}
                      className="mt-1 w-full"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {step === 'name' && (
            <div>
              <input
                type="text"
                value={slot.name}
                maxLength={14}
                onChange={(e) => patchSlot({ name: e.target.value })}
                onBlur={() => slot.name.trim() && track('name_entered', { step: 'name' })}
                placeholder={t('namePlaceholder')}
                className="h-12 w-full rounded-xl border-2 border-ink px-3 text-base font-semibold outline-none"
              />
              <p className="mt-2 text-xs opacity-55">{t('nameOptional')}</p>
            </div>
          )}

          {step === 'quantity' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => patchSlot({ quantity: Math.max(1, slot.quantity - 1) })}
                className="h-11 w-11 rounded-xl border-2 border-ink text-lg font-bold"
                aria-label="-"
              >
                −
              </button>
              <span className="w-10 text-center font-display text-lg font-extrabold" data-testid="qty">
                {slot.quantity}
              </span>
              <button
                onClick={() => patchSlot({ quantity: Math.min(12, slot.quantity + 1) })}
                className="h-11 w-11 rounded-xl border-2 border-ink text-lg font-bold"
                aria-label="+"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Wstecz / Dalej */}
        <div className="mt-3 flex justify-between">
          <button
            onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)]!)}
            disabled={stepIndex === 0}
            className="rounded-xl border-2 border-ink bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            ← {t('back')}
          </button>
          <button
            onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)]!)}
            disabled={stepIndex === STEPS.length - 1}
            data-testid="next-step"
            className="rounded-xl border-2 border-ink bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            {t('next')} →
          </button>
        </div>

        {/* price — the ladder spans ALL figurines */}
        <div className="mt-6 rounded-2xl border-2 border-ink bg-cream p-4 shadow-offset-sm">
          <div className="flex items-end justify-between">
            <span className="font-display text-3xl font-extrabold" data-testid="unit-price">
              {zl(price.ladderUnitPrice)}
              <span className="ml-1 text-sm font-normal opacity-55">{t('priceEach')}</span>
            </span>
            {totalQty > 1 && (
              <span className="text-sm">
                {t('total')} ({t('pieces', { count: totalQty })}):{' '}
                <b className="font-display text-lg" data-testid="total-price">
                  {zl(price.total)}
                </b>
              </span>
            )}
          </div>
        </div>

        <button
          onClick={addToCart}
          disabled={adding}
          data-testid="add-to-cart"
          className="mt-4 w-full rounded-2xl border-2 border-ink bg-mandarin py-3 font-display font-bold text-white shadow-offset disabled:opacity-60"
        >
          {adding ? '…' : t('add')}
        </button>
        {added && (
          <p className="mt-3 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900" data-testid="added-ok">
            {t('added')}{' '}
            <Link href="/cart" className="underline underline-offset-2">
              {tCart('goToCart')}
            </Link>
          </p>
        )}
        {addError && (
          <p className="mt-3 rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-900">{t('addError')}</p>
        )}
      </div>

      {/* mobile sticky buy bar — completes add-to-cart in place (T043) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-white p-3 lg:hidden" data-testid="sticky-buy">
        {added ? (
          <Link
            href="/cart"
            className="block w-full rounded-xl border-2 border-ink bg-emerald-100 py-3 text-center font-display font-bold text-emerald-900"
          >
            {t('added')} {tCart('goToCart')}
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="font-display text-lg font-extrabold leading-none">{zl(price.total)}</p>
              <p className="text-xs opacity-55">
                {t('pieces', { count: totalQty })} · {zl(price.ladderUnitPrice)}
                {t('priceEach')}
              </p>
            </div>
            <button
              onClick={addToCart}
              disabled={adding}
              className="flex-1 rounded-xl border-2 border-ink bg-mandarin py-3 font-display font-bold text-white disabled:opacity-60"
            >
              {adding ? '…' : t('add')}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

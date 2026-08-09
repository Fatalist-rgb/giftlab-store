'use client';

import {
  buildScene,
  computePrice,
  faceAutoFit,
  renderSceneToCanvas,
  sceneGeometry,
  type DesignState,
  type LocalizedText,
  type ProductSchema,
} from '@gl/constructor';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { demoSchema, SAMPLE_FACE_KEY, SAMPLE_PHOTO_ID } from '@/lib/schema';
import { DRINK_ORDER, POSES, POSE_GROUPS, drinkOf, groupOf, isPoseSchema } from '@/lib/poses';
import { CheckIcon } from '@/components/icons';
import { createBrowserCutout } from '@/lib/cutout';
import { scanFaces, warmFaceDetector } from '@/lib/face-detect';
import { uploadPhotoWithCutout } from '@/lib/uploads';
import { track } from '@/lib/analytics';
import { ProductGallery } from './ProductGallery';

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

  const mkSlot = (variantId = bodyLayer.variants[0]!.id): Slot => ({
    variantId,
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

  /**
   * `?t=<pose>` — the pose the visitor clicked on a template or "other versions" card.
   *
   * Applied in an effect rather than as the initial state on purpose: the page is
   * statically prerendered, so the server has no query string and seeding state from
   * `location` during render is a hydration mismatch. It runs once, and only while the
   * builder is still untouched, so a click inside the builder is never overwritten.
   */
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get('t');
    if (!want || !bodyLayer.variants.some((v) => v.id === want)) return;
    setSlots((all) => (all.length === 1 && !all[0]!.facePhotoId && !all[0]!.name
      ? [{ ...all[0]!, variantId: want }]
      : all));
  }, [bodyLayer]);

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
              zoneW: geoOf(target).faceBounds.w,
              zoneH: geoOf(target).faceBounds.h,
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

  /**
   * Background removal can fail for reasons the customer cannot fix (old device, no
   * WASM, an exotic image). Rather than dead-ending the order we let them continue with
   * the plain photo: the face zone is masked anyway, the backend marks the upload as
   * "cutout skipped" and the operator sees a warning before printing.
   */
  const useWithoutCutout = async () => {
    const file = retryFileRef.current;
    if (!file) return;
    const target = active;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      const localId = `upload-${target}-${Date.now()}`;
      assetsRef.current.set(localId, img);
      patchSlot({ facePhotoId: localId, adj: CENTER }, target);
      setAssetVersion((v) => v + 1);
      setProgress({ stage: 'idle' });
      track('cutout_skipped', { step: 'cutout' });
      void uploadPhotoWithCutout(file, null, true).then((stored) => {
        if (!stored) return;
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

  /** Geometry of one slot's POSE. Each pose is its own photo crop, so the canvas and the
   *  face hole move when the customer switches — resolved by the engine, never guessed. */
  const geoOf = (index: number) => sceneGeometry(schema, toDesign(slots[index]!));
  const geo = sceneGeometry(schema, activeDesign);

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
      // a toast, not a persistent banner: it confirms, offers the cart, and leaves
      setAdded(true);
      window.setTimeout(() => setAdded(false), 6000);
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

  const liveScene = (
    <div className="relative flex flex-col items-center rounded-[24px] border-2 border-ink bg-cream p-3 shadow-offset sm:p-5">
          {/* A fixed-height stage on every breakpoint. Poses are not one shape — a
              standing figure is 615×1231, a lying one 1445×1083 — so a width-driven box
              would jump by 200px the moment the customer switches pose. Height is the
              budget; the canvas fits inside it and keeps its own ratio. */}
          <div className="flex h-[clamp(190px,30vh,290px)] w-full items-center justify-center lg:h-[420px]">
          <canvas
            ref={canvasRef}
            // the real pixel size from the very first paint: a bare <canvas> defaults to
            // 300×150 and jumps to the figure's size once the renderer sizes it, which is
            // a visible layout shift on mobile (Lighthouse CLS budget)
            width={Math.round(geo.canvas.w * PREVIEW_SCALE)}
            height={Math.round(geo.canvas.h * PREVIEW_SCALE)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            /* contain-fit: auto size + max on BOTH axes lets the browser scale the
               canvas by its intrinsic ratio. Forcing h-full here once squashed the
               lying pose 20% narrower — an explicit height beats aspect-ratio the
               moment max-width clamps the other axis. */
            className={`mx-auto block h-auto max-h-full w-auto max-w-full ${slot.facePhotoId ? 'cursor-grab touch-none' : ''}`}
          />
          </div>
          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[24px] bg-white/85">
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
      <p className="mt-2 text-center text-[11.5px] opacity-55">
        {t(slot.facePhotoId ? 'dragHint' : 'dragHint0')}
      </p>
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 lg:pb-10">
      {/* breadcrumb + the delivery promise, the two things a buyer checks first */}
      <nav className="flex items-center gap-1.5 py-2 text-[12.5px] opacity-60" aria-label="breadcrumb">
        <Link href="/" className="hover:opacity-100">{t('crumbShop')}</Link>
        <span aria-hidden>/</span>
        <span>{t('h1')}</span>
      </nav>
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[16px] border-2 border-ink bg-lime px-4 py-2.5 shs">
        <b className="font-display text-[15px]">{t('deliverToday')}</b>
        <span className="text-[12.5px] opacity-70 sm:ml-auto">{t('deliveryNote')}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,.94fr)] lg:gap-9 lg:items-start">
        {/* left: the gallery rail drives one frame — live build or a photo */}
        {/* sticky on EVERY size: on a phone the preview used to scroll away long
            before the step tabs came into reach, so the customer picked a pose blind.
            z-30 keeps it under the header (z-50) and above the builder. */}
        <div className="sticky top-[60px] z-30 bg-white py-2 lg:top-[76px] lg:py-0">
          <ProductGallery live={liveScene} />
          <p className="mt-3 text-center text-[11px] opacity-45">{t('engine')}</p>
        </div>

        {/* right: what it is, what it costs, and the builder */}
        <div className="min-w-0">
        <h1 className="font-display text-[30px] font-extrabold leading-tight sm:text-[38px]">{t('h1')}</h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <b className="font-display text-[14.5px]">★ {t('rating')}</b>
          <a href="#opinie" className="text-[13.5px] underline underline-offset-2 opacity-65 hover:opacity-100">
            {t('reviewsLink')}
          </a>
        </div>
        <p className="mt-3 max-w-[52ch] text-[15px] opacity-75">{t('sub')}</p>
        <div className="mt-3.5 flex flex-wrap gap-2" data-testid="spec">
          <span className="stkr bg-white text-[12.5px]">{t('specMaterial')}</span>
          <span className="stkr bg-white text-[12.5px]">{t('specSize')}</span>
          <span className="stkr bg-white text-[12.5px]">{t('specMagnet')}</span>
        </div>

        {/* price sits ABOVE the builder: the number is the first question, and the
            ladder spans every figurine in the order */}
        <div className="mt-4 rounded-[20px] border-2 border-ink bg-cream p-4 shs">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <span className="flex items-baseline gap-2">
              <span className="text-[11px] font-bold tracking-wider opacity-45">{t('priceLabel')}</span>
              <b className="font-display text-[30px] font-extrabold leading-none" data-testid="unit-price">
                {zl(price.ladderUnitPrice)}
              </b>
              <span className="text-[13px] opacity-55">{t('priceEach')}</span>
            </span>
            {totalQty > 1 && (
              <span className="text-[13.5px]">
                {t('total')} ({t('pieces', { count: totalQty })}):{' '}
                <b className="font-display text-[17px]" data-testid="total-price">{zl(price.total)}</b>
              </span>
            )}
          </div>
          <p className="mt-2 border-t border-dashed border-ink/20 pt-2 text-[12.5px] opacity-60">
            {t('priceNote')}
          </p>
        </div>

        <div className="mt-4 rounded-[22px] border-2 border-ink bg-white p-4 shs sm:p-5">
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
        <div className="mt-1 flex gap-1.5 overflow-x-auto" role="tablist" style={{ scrollbarWidth: 'none' }}>
          {STEPS.map((s, i) => (
            <button
              key={s}
              role="tab"
              aria-selected={step === s}
              data-testid={`step-${s}`}
              onClick={() => setStep(s)}
              className={`relative inline-flex min-h-[44px] flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[12px] border-2 border-ink px-2.5 py-1.5 font-display text-[13px] font-bold transition-transform hover:-translate-y-px ${
                step === s ? 'bg-ink text-white shs' : 'bg-white'
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                  step === s ? 'bg-lime text-ink' : 'bg-mandarin text-white'
                }`}
              >
                {i + 1}
              </span>
              {stepLabel[s]}
              {stepDone[s] && (
                <span
                  className="absolute -right-[5px] -top-[6px] flex h-[17px] w-[17px] items-center justify-center rounded-full border-2 border-ink bg-lime text-[9px] font-bold text-ink"
                  aria-hidden
                >
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-[190px]">
          {step === 'character' &&
            (isPoseSchema(bodyLayer.variants.map((v) => v.id)) ? (
              /* the approved picker: 3 pose cards + the drink toggled separately */
              <div>
                <div className="grid grid-cols-3 gap-2.5">
                  {POSE_GROUPS.map((g) => {
                    const on = groupOf(slot.variantId) === g;
                    // the active tile previews the chosen combination; the others show
                    // their bare pose, so switching never surprises
                    const shownId = on ? slot.variantId : g.opts.none!;
                    const art = POSES.find((p) => p.id === shownId)!;
                    const variantOf = (id: string) => bodyLayer.variants.find((v) => v.id === id);
                    return (
                      <button
                        key={g.id}
                        aria-pressed={on}
                        data-testid={`variant-${g.id}`}
                        title={label(variantOf(g.opts.none!)?.label)}
                        onClick={() => {
                          if (on) return;
                          // keep the drink when the new pose offers it, drop it otherwise
                          const d = drinkOf(slot.variantId);
                          const next = g.opts[d] ?? g.opts.none!;
                          patchSlot({ variantId: next });
                          track('character_chosen', { step: 'character', variant: next });
                        }}
                        className={`rounded-[14px] border-2 border-ink p-1.5 text-left transition-transform hover:-translate-y-0.5 ${
                          on ? 'bg-lime shs' : 'bg-white'
                        }`}
                      >
                        <div className="flex h-[92px] items-center justify-center overflow-hidden rounded-[9px] border-2 border-ink bg-white">
                          <img
                            src={art.src}
                            alt=""
                            className="h-auto max-h-[84%] w-auto max-w-[84%]"
                            loading="lazy"
                          />
                        </div>
                        <span className="mt-1.5 block font-display text-[10.5px] font-semibold leading-tight">
                          {label(variantOf(g.opts.none!)?.label)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {DRINK_ORDER.filter((d) => groupOf(slot.variantId).opts[d]).length > 1 && (
                  <div className="mt-3.5" data-testid="drink-row">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider opacity-55">
                      {t('drinkL')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DRINK_ORDER.filter((d) => groupOf(slot.variantId).opts[d]).map((d) => {
                        const on = drinkOf(slot.variantId) === d;
                        return (
                          <button
                            key={d}
                            aria-pressed={on}
                            data-testid={`drink-${d}`}
                            onClick={() => {
                              const next = groupOf(slot.variantId).opts[d]!;
                              patchSlot({ variantId: next });
                              track('character_chosen', { step: 'character', variant: next });
                            }}
                            className={`rounded-xl border-2 border-ink px-3.5 py-2 text-[12.5px] font-bold ${
                              on ? 'bg-lime shadow-offset-sm' : 'bg-white'
                            }`}
                          >
                            {t(`drink.${d}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* any other product's schema: the generic flat pills */
              <div className="flex flex-wrap gap-2">
                {bodyLayer.variants.map((v, vi) => (
                  <button
                    key={v.id}
                    // stable hook for tests: the labels come from the published schema
                    data-testid={`variant-${vi}`}
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
            ))}

          {step === 'photo' && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" data-testid="file" />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn-s px-4 py-2 text-[14.5px]"
                  data-testid="upload"
                >
                  {slot.facePhotoId ? t('swapPhoto') : t('upload')}
                </button>
                <button onClick={useSample} className="stkr bg-white px-4 py-2 text-[13px]">
                  {t('sample')}
                </button>
                {slot.facePhotoId && (
                  <button onClick={clearFace} className="rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm" aria-label="✕">
                    ✕
                  </button>
                )}
              </div>
              {progress.stage === 'error' && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-red-100 px-3 py-2 text-sm text-red-900" data-testid="cutout-error">
                  <span>{t('cutoutError')}</span>
                  <button onClick={retryCutout} className="font-bold underline underline-offset-2">
                    {t('retry')}
                  </button>
                  {retryFileRef.current && (
                    <button
                      onClick={() => void useWithoutCutout()}
                      className="font-bold underline underline-offset-2"
                      data-testid="use-without-cutout"
                    >
                      {t('useWithoutCutout')}
                    </button>
                  )}
                </div>
              )}
              {progress.stage === 'multiface' && (
                <div className="mt-2 rounded-xl bg-red-100 px-3 py-2 text-sm text-red-900" data-testid="multiface-error">
                  {t('multiFace')}
                </div>
              )}
              {/* the guide sits ABOVE the upload on purpose: a warning after the fact
                  cannot un-choose a blurry group photo */}
              <figure className="mt-3.5 m-0" data-testid="photo-guide">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider opacity-55">
                  {t('guideLabel')}
                </p>
                <img
                  src="/photos/photo-guide.webp"
                  alt={t('guideAlt')}
                  width={900}
                  height={900}
                  loading="lazy"
                  decoding="async"
                  className="block h-auto w-full rounded-[14px] border-2 border-ink bg-white"
                />
              </figure>
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

        {/* the linear path with its position — Wstecz · n/4 · Dalej */}
        <div className="mt-5 flex items-center gap-2.5 pt-3.5" style={{ borderTop: '2px dashed rgba(23,19,26,.16)' }}>
          <button
            onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)]!)}
            disabled={stepIndex === 0}
            data-testid="step-prev"
            className="btn-s px-4 py-2 text-[14px] disabled:opacity-40"
          >
            ← {t('back')}
          </button>
          <span className="mx-auto text-[12px] tabular-nums opacity-45" data-testid="step-count">
            {stepIndex + 1} / {STEPS.length}
          </span>
          <button
            onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)]!)}
            disabled={stepIndex === STEPS.length - 1}
            data-testid="next-step"
            className="btn-s px-4 py-2 text-[14px] disabled:opacity-40"
          >
            {t('next')} →
          </button>
        </div>
        </div>

        {/* desktop CTA — OUTSIDE the step card, so it never vanishes on steps 1–3;
            the price rides ON the button, and the cart is one click away beside it */}
        <div className="mt-5 hidden gap-2.5 lg:flex">
          <button
            onClick={addToCart}
            disabled={adding}
            data-testid="add-to-cart"
            className="btn-p flex-1 text-[16px] disabled:opacity-60"
          >
            {adding ? '…' : `${t('add')} · ${zl(price.total)}`}
          </button>
          <Link href="/cart" className="btn-s text-[15px]">
            {tCart('goToCart')}
          </Link>
        </div>
        {addError && (
          <p className="mt-3 rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-900">{t('addError')}</p>
        )}
        </div>
      </div>

      {/* post-add toast, the demo's — confirms and offers the cart, then gets out of the way */}
      {added && (
        <div className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 lg:bottom-6" data-testid="added-ok">
          <div
            className="flex items-center gap-3 rounded-[14px] px-4 py-3 text-white"
            style={{ background: 'var(--ink)', boxShadow: '4px 5px 0 rgba(0,0,0,.35)' }}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime text-ink">
              <CheckIcon s={13} />
            </span>
            <span className="font-display text-[14px] font-bold">{t('added')}</span>
            <Link href="/cart" className="font-display text-[13px] font-bold text-lime underline underline-offset-2">
              {tCart('goToCart')}
            </Link>
          </div>
        </div>
      )}

      {/* mobile sticky buy bar — completes add-to-cart in place (T043); the toast
          above is the confirmation, so the bar itself never changes shape */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-white p-3 lg:hidden" data-testid="sticky-buy">
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
            className="btn-p flex-1 py-3 disabled:opacity-60"
          >
            {adding ? '…' : t('add')}
          </button>
        </div>
      </div>
    </main>
  );
}

'use client';

import {
  buildScene,
  computePrice,
  renderSceneToCanvas,
  type DesignState,
  type LocalizedText,
} from '@gl/constructor';
import { createCutoutProvider } from '@gl/cutout';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { demoSchema, SAMPLE_FACE_KEY, SAMPLE_PHOTO_ID } from '@/lib/schema';

const PREVIEW_SCALE = 1.2;
const cutout = createCutoutProvider('mock');

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

export function Constructor() {
  const t = useTranslations('product');
  const locale = useLocale();
  const schema = demoSchema;
  const bodyLayer = schema.characterLayers[0]!;

  const [variantId, setVariantId] = useState(bodyLayer.variants[0]!.id);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [facePhotoId, setFacePhotoId] = useState<string | null>(null);
  const [adj, setAdj] = useState<Adj>(CENTER);
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assetsRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const dragRef = useRef<{ x: number; y: number; base: Adj } | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  const [assetVersion, setAssetVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // load body variants + mask + the built-in sample face, once
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

  // upload -> background removal (adapter) -> face asset
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const res = await cutout.removeBackground({ imageBytes: bytes, mime: file.type || 'image/png' });
      if (res.ok && res.imageBytes) {
        const blob = new Blob([res.imageBytes as unknown as BlobPart], { type: res.mime ?? 'image/png' });
        const url = URL.createObjectURL(blob);
        const img = await loadImage(url);
        assetsRef.current.set('upload', img);
        setFacePhotoId('upload');
        setAdj(CENTER);
        setAssetVersion((v) => v + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  const useSample = () => {
    setFacePhotoId(SAMPLE_PHOTO_ID);
    setAdj(CENTER);
  };
  const clearFace = () => setFacePhotoId(null);

  const design: DesignState = useMemo(
    () => ({
      productSchemaId: schema.id,
      schemaVersion: schema.version,
      characterSelections: { [bodyLayer.id]: variantId },
      faceLayer: facePhotoId ? { uploadedPhotoId: facePhotoId, ...adj } : null,
      textValues: name.trim() ? [{ fieldId: 'name', value: name.trim() }] : [],
      selectedOptions: {},
      quantity,
      photoStatus: facePhotoId ? 'ready' : 'deferred',
    }),
    [schema.id, schema.version, bodyLayer.id, variantId, name, quantity, facePhotoId, adj],
  );

  // live preview — same engine the render worker uses for the print file
  useEffect(() => {
    if (!assetsReady || !canvasRef.current) return;
    const scene = buildScene(schema, design);
    renderSceneToCanvas(canvasRef.current, scene, {
      schema,
      assets: assetsRef.current,
      scale: PREVIEW_SCALE,
    });
  }, [assetsReady, assetVersion, schema, design]);

  // drag the face inside its zone
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!facePhotoId) return;
    dragRef.current = { x: e.clientX, y: e.clientY, base: adj };
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
    setAdj({ ...d.base, x: d.base.x + dx, y: d.base.y + dy });
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const price = useMemo(() => computePrice(schema, [design]), [schema, design]);
  const zl = (grosz: number) => `${Math.round(grosz / 100)} zł`;
  const label = (l?: LocalizedText) => l?.[locale] ?? l?.pl ?? '';

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-2">
      {/* live preview */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative rounded-3xl border-2 border-ink bg-cream p-4 shadow-offset">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`mx-auto block h-auto w-full max-w-[365px] ${facePhotoId ? 'cursor-grab touch-none' : ''}`}
          />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/80">
              <span className="font-display font-bold">{t('removing')}</span>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-xs opacity-55">{t('engine')}</p>
      </div>

      {/* controls */}
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t('title')}</h1>
        <p className="mt-2 text-sm opacity-60">{t('freeNote')}</p>

        {/* character */}
        <div className="mt-6">
          <p className="font-display text-sm font-bold uppercase tracking-wide opacity-60">{t('character')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {bodyLayer.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                aria-pressed={variantId === v.id}
                className={`rounded-xl border-2 border-ink px-4 py-2 text-sm font-bold ${
                  variantId === v.id ? 'bg-lime shadow-offset-sm' : 'bg-white'
                }`}
              >
                {label(v.label)}
              </button>
            ))}
          </div>
        </div>

        {/* photo */}
        <div className="mt-5">
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" data-testid="file" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border-2 border-ink bg-white px-4 py-2 text-sm font-bold"
              data-testid="upload"
            >
              {t('upload')}
            </button>
            <button onClick={useSample} className="rounded-xl border-2 border-ink bg-white px-4 py-2 text-sm font-bold">
              {t('sample')}
            </button>
            {facePhotoId && (
              <button onClick={clearFace} className="rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm">
                ✕
              </button>
            )}
          </div>
          {!facePhotoId && <p className="mt-2 text-xs opacity-55">{t('deferred')}</p>}
          <p className="mt-2 text-xs opacity-45">{t('mockNote')}</p>
        </div>

        {/* adjust (only with a face) */}
        {facePhotoId && (
          <div className="mt-5 rounded-2xl border-2 border-ink bg-white p-4 shadow-offset-sm">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold uppercase tracking-wide opacity-60">{t('adjust')}</p>
              <button onClick={() => setAdj(CENTER)} className="text-xs font-semibold underline">
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
                value={adj.scale}
                data-testid="scale"
                onChange={(e) => setAdj((a) => ({ ...a, scale: parseFloat(e.target.value) }))}
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
                value={adj.rotation}
                data-testid="rotation"
                onChange={(e) => setAdj((a) => ({ ...a, rotation: parseFloat(e.target.value) }))}
                className="mt-1 w-full"
              />
            </label>
          </div>
        )}

        {/* name */}
        <div className="mt-5">
          <label className="font-display text-sm font-bold uppercase tracking-wide opacity-60">{t('name')}</label>
          <input
            type="text"
            value={name}
            maxLength={14}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            className="mt-2 h-12 w-full rounded-xl border-2 border-ink px-3 text-base font-semibold outline-none"
          />
        </div>

        {/* quantity */}
        <div className="mt-5">
          <p className="font-display text-sm font-bold uppercase tracking-wide opacity-60">{t('quantity')}</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-11 w-11 rounded-xl border-2 border-ink text-lg font-bold"
              aria-label="-"
            >
              −
            </button>
            <span className="w-10 text-center font-display text-lg font-extrabold" data-testid="qty">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => Math.min(12, q + 1))}
              className="h-11 w-11 rounded-xl border-2 border-ink text-lg font-bold"
              aria-label="+"
            >
              +
            </button>
          </div>
        </div>

        {/* price */}
        <div className="mt-6 rounded-2xl border-2 border-ink bg-cream p-4 shadow-offset-sm">
          <div className="flex items-end justify-between">
            <span className="font-display text-3xl font-extrabold" data-testid="unit-price">
              {zl(price.ladderUnitPrice)}
              <span className="ml-1 text-sm font-normal opacity-55">{t('priceEach')}</span>
            </span>
            {quantity > 1 && (
              <span className="text-sm">
                {t('total')}:{' '}
                <b className="font-display text-lg" data-testid="total-price">
                  {zl(price.total)}
                </b>
              </span>
            )}
          </div>
        </div>

        <button className="mt-4 w-full rounded-2xl border-2 border-ink bg-mandarin py-3 font-display font-bold text-white shadow-offset">
          {t('add')}
        </button>
      </div>
    </main>
  );
}

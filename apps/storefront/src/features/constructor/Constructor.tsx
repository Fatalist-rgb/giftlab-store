'use client';

import {
  buildScene,
  computePrice,
  renderSceneToCanvas,
  type DesignState,
  type LocalizedText,
} from '@gl/constructor';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { demoSchema, SAMPLE_FACE_KEY, SAMPLE_PHOTO_ID } from '@/lib/schema';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function Constructor() {
  const t = useTranslations('product');
  const locale = useLocale();
  const schema = demoSchema;
  const bodyLayer = schema.characterLayers[0]!;

  const [variantId, setVariantId] = useState(bodyLayer.variants[0]!.id);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [faceOn, setFaceOn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assetsRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [assetsReady, setAssetsReady] = useState(false);

  // load every asset the preview might need, once
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

  const design: DesignState = useMemo(
    () => ({
      productSchemaId: schema.id,
      schemaVersion: schema.version,
      characterSelections: { [bodyLayer.id]: variantId },
      faceLayer: faceOn ? { uploadedPhotoId: SAMPLE_PHOTO_ID, x: 0, y: 0, scale: 1, rotation: 0 } : null,
      textValues: name.trim() ? [{ fieldId: 'name', value: name.trim() }] : [],
      selectedOptions: {},
      quantity,
      photoStatus: faceOn ? 'ready' : 'deferred',
    }),
    [schema.id, schema.version, bodyLayer.id, variantId, name, quantity, faceOn],
  );

  // live preview — the SAME engine the render worker uses for the print file
  useEffect(() => {
    if (!assetsReady || !canvasRef.current) return;
    const scene = buildScene(schema, design);
    renderSceneToCanvas(canvasRef.current, scene, { schema, assets: assetsRef.current, scale: 1.2 });
  }, [assetsReady, schema, design]);

  const price = useMemo(() => computePrice(schema, [design]), [schema, design]);
  const zl = (grosz: number) => `${Math.round(grosz / 100)} zł`;
  const label = (l?: LocalizedText) => l?.[locale] ?? l?.pl ?? '';

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-2">
      {/* live preview */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border-2 border-ink bg-cream p-4 shadow-offset">
          <canvas ref={canvasRef} className="mx-auto block h-auto w-full max-w-[365px]" />
        </div>
        <p className="mt-3 text-center text-xs opacity-55">{t('engine')}</p>
      </div>

      {/* controls */}
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t('title')}</h1>
        <p className="mt-2 text-sm opacity-60">{t('freeNote')}</p>

        {/* character */}
        <div className="mt-6">
          <p className="font-display text-sm font-bold uppercase tracking-wide opacity-60">
            {t('character')}
          </p>
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

        {/* photo (sample) */}
        <div className="mt-5">
          <button
            onClick={() => setFaceOn((v) => !v)}
            aria-pressed={faceOn}
            className={`rounded-xl border-2 border-ink px-4 py-2 text-sm font-bold ${
              faceOn ? 'bg-lime shadow-offset-sm' : 'bg-white'
            }`}
          >
            {t('sample')}
          </button>
          {!faceOn && <p className="mt-2 text-xs opacity-55">{t('deferred')}</p>}
        </div>

        {/* name */}
        <div className="mt-5">
          <label className="font-display text-sm font-bold uppercase tracking-wide opacity-60">
            {t('name')}
          </label>
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
          <p className="font-display text-sm font-bold uppercase tracking-wide opacity-60">
            {t('quantity')}
          </p>
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

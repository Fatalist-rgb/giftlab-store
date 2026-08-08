import type { DesignState } from '../design-state/types.js';
import type { ProductSchema, Variant } from '../schema/types.js';
import { nodeZ, type Scene, type SceneNode } from './types.js';

/**
 * The character variant the design has selected, per layer. Falls back to the layer's
 * first variant so a schema change that drops a variant degrades to "the default pose"
 * instead of an empty figure.
 */
function selectedVariants(schema: ProductSchema, design: DesignState): Variant[] {
  const out: Variant[] = [];
  for (const layer of schema.characterLayers) {
    const chosen = design.characterSelections[layer.id];
    const v = layer.variants.find((x) => x.id === chosen) ?? layer.variants[0];
    if (v) out.push(v);
  }
  return out;
}

/**
 * The artwork geometry the scene is authored in.
 *
 * A pose is a photograph, not a sprite on a shared grid: standing is 615×1231, lying is
 * 1445×1083, and the face hole moves with it. Geometry therefore comes from the selected
 * variant when it declares any, and from the product otherwise. The FIRST layer that
 * declares geometry wins — there is exactly one body layer today, and a second layer
 * overriding the canvas out from under the first would be a schema bug, not a feature.
 */
export function sceneGeometry(
  schema: ProductSchema,
  design: DesignState,
): { canvas: { w: number; h: number }; faceBounds: ProductSchema['faceZone']['bounds']; namePos?: { x: number; y: number; rot: number } } {
  const v = selectedVariants(schema, design).find((x) => x.canvasPx ?? x.faceBounds ?? x.namePos);
  return {
    canvas: v?.canvasPx ?? schema.canvasPx,
    faceBounds: v?.faceBounds ?? schema.faceZone.bounds,
    namePos: v?.namePos,
  };
}

/**
 * buildScene is PURE and DETERMINISTIC — no Date.now, no randomness, no I/O. Given the
 * same (schema, designState) it returns the same Scene in the browser and in Node, which
 * is the mechanism behind the "what the customer saw is what gets printed" guarantee
 * (Constitution II). The renderer (Konva in the browser, @napi-rs/canvas on the server)
 * turns this list into pixels; it adds nothing the Scene does not already fix.
 */
export function buildScene(schema: ProductSchema, design: DesignState): Scene {
  const nodes: SceneNode[] = [];
  const geo = sceneGeometry(schema, design);

  // 1. character artwork — the selected variant of each layer (fallback: first variant)
  for (const layer of schema.characterLayers) {
    const selectedId = design.characterSelections[layer.id];
    const variant = layer.variants.find((v) => v.id === selectedId) ?? layer.variants[0];
    if (variant) {
      nodes.push({ kind: 'image', assetKey: variant.assetKey, zIndex: layer.zIndex });
    }
  }

  // 2. the customer's face — masked into the face zone; placeholder while deferred
  const face = design.faceLayer;
  const deferred = face === null || design.photoStatus !== 'ready';
  nodes.push({
    kind: 'face',
    photoId: face?.uploadedPhotoId ?? null,
    bounds: geo.faceBounds,
    maskAssetKey: schema.faceZone.maskAssetKey,
    transform: face
      ? { x: face.x, y: face.y, scale: face.scale, rotation: face.rotation }
      : { x: 0, y: 0, scale: 1, rotation: 0 },
    placeholder: deferred,
    zIndex: schema.faceZone.zIndex,
  });

  // 3. custom text — only non-empty values for known fields
  for (const tv of design.textValues) {
    const field = schema.textFields.find((f) => f.id === tv.fieldId);
    if (!field || tv.value.trim() === '') continue;
    nodes.push({
      kind: 'text',
      value: tv.value,
      font: tv.font ?? field.fonts[0] ?? 'sans-serif',
      color: tv.color ?? field.colors[0] ?? '#000000',
      placement: field.placement,
      ...(geo.namePos ? { anchor: geo.namePos } : {}),
      zIndex: field.zIndex,
    });
  }

  // stable paint order — ties keep insertion order, so the Scene is fully determined
  nodes.sort((a, b) => nodeZ(a) - nodeZ(b));
  return { canvas: geo.canvas, nodes };
}

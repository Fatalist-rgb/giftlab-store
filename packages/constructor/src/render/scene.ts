import type { DesignState } from '../design-state/types.js';
import type { ProductSchema } from '../schema/types.js';
import { nodeZ, type Scene, type SceneNode } from './types.js';

/**
 * buildScene is PURE and DETERMINISTIC — no Date.now, no randomness, no I/O. Given the
 * same (schema, designState) it returns the same Scene in the browser and in Node, which
 * is the mechanism behind the "what the customer saw is what gets printed" guarantee
 * (Constitution II). The renderer (Konva in the browser, @napi-rs/canvas on the server)
 * turns this list into pixels; it adds nothing the Scene does not already fix.
 */
export function buildScene(schema: ProductSchema, design: DesignState): Scene {
  const nodes: SceneNode[] = [];

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
    bounds: schema.faceZone.bounds,
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
      zIndex: field.zIndex,
    });
  }

  // stable paint order — ties keep insertion order, so the Scene is fully determined
  nodes.sort((a, b) => nodeZ(a) - nodeZ(b));
  return { nodes };
}

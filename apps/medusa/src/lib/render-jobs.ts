import type { MedusaContainer } from '@medusajs/framework'
import { PERSONALIZATION_MODULE } from '../modules/personalization'
import type PersonalizationModuleService from '../modules/personalization/service'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../modules/product_customization'
import type ProductCustomizationModuleService from '../modules/product_customization/service'
import { enqueueRender } from './queue'

type StoredFaceLayer = {
  uploaded_photo_id?: string | null
  x?: number
  y?: number
  scale?: number
  rotation?: number
} | null

type SchemaDoc = {
  characterLayers?: Array<{ variants?: Array<{ assetKey?: string }> }>
  faceZone?: { maskAssetKey?: string }
}

export type EnqueueResult =
  | { ok: true; queued: boolean }
  | { ok: false; reason: 'no-schema' | 'photo-not-ready' }

/**
 * Build and enqueue the self-contained render job for one order line: the frozen
 * schema, the engine-shaped design (face id rewritten to its R2 cutout key) and every
 * asset key the renderer needs. Shared by the order.placed subscriber and the
 * deferred-photo attach endpoint, so the two paths can never drift.
 */
export async function enqueueRenderForLine(
  container: MedusaContainer,
  input: {
    orderId: string
    orderDisplayId: number | null
    lineItemId: string
    designStateId: string
    /** medusa product id the schema rows are keyed by (line item's product_id) */
    schemaProductId: string
  },
): Promise<EnqueueResult> {
  const personalization: PersonalizationModuleService = container.resolve(PERSONALIZATION_MODULE)
  const schemas: ProductCustomizationModuleService = container.resolve(PRODUCT_CUSTOMIZATION_MODULE)

  const design = await personalization.retrieveDesignState(input.designStateId)

  const schemaRow = await schemas.getActiveSchema(input.schemaProductId)
  if (!schemaRow) return { ok: false, reason: 'no-schema' }
  const schemaDoc = schemaRow.definition as SchemaDoc

  const assetKeys = new Set<string>()
  for (const layer of schemaDoc.characterLayers ?? [])
    for (const v of layer.variants ?? []) if (v.assetKey) assetKeys.add(v.assetKey)
  if (schemaDoc.faceZone?.maskAssetKey) assetKeys.add(schemaDoc.faceZone.maskAssetKey)

  const fl = design.face_layer as StoredFaceLayer
  let engineFace: Record<string, unknown> | null = null
  if (fl?.uploaded_photo_id) {
    let faceKey: string | null = null
    try {
      const photo = await personalization.retrieveUploadedPhoto(fl.uploaded_photo_id)
      faceKey = photo.cutout_status === 'ready' && photo.cutout_key ? photo.cutout_key : null
    } catch {
      faceKey = null
    }
    if (!faceKey) return { ok: false, reason: 'photo-not-ready' }
    const key = `/${faceKey}`.replace(/^\/+/, '/')
    assetKeys.add(key)
    engineFace = { uploadedPhotoId: key, x: fl.x ?? 0, y: fl.y ?? 0, scale: fl.scale ?? 1, rotation: fl.rotation ?? 0 }
  }

  const engineDesign = {
    productSchemaId: design.product_schema_id,
    schemaVersion: design.schema_version,
    characterSelections: design.character_selections ?? {},
    selectedOptions: design.selected_options ?? {},
    faceLayer: engineFace,
    textValues: ((design.text_values as Array<{ field_id: string; value: string }> | null) ?? []).map(
      (t) => ({ fieldId: t.field_id, value: t.value }),
    ),
    quantity: Math.max(1, design.quantity ?? 1),
    photoStatus: engineFace ? 'ready' : 'deferred',
  }

  const queued = await enqueueRender({
    orderId: input.orderId,
    orderDisplayId: input.orderDisplayId,
    lineItemId: input.lineItemId,
    designStateId: input.designStateId,
    schema: schemaRow.definition as Record<string, unknown>,
    design: engineDesign,
    assetKeys: [...assetKeys],
  })
  return { ok: true, queued }
}

import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'
import type { IOrderModuleService } from '@medusajs/framework/types'
import { PERSONALIZATION_MODULE } from '../modules/personalization'
import type PersonalizationModuleService from '../modules/personalization/service'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../modules/product_customization'
import type ProductCustomizationModuleService from '../modules/product_customization/service'
import { enqueueRender } from '../lib/queue'

type StoredFaceLayer = {
  uploaded_photo_id?: string | null
  x?: number
  y?: number
  scale?: number
  rotation?: number
} | null

type SchemaDoc = {
  medusaProductId?: string
  characterLayers?: Array<{ variants?: Array<{ assetKey?: string }> }>
  faceZone?: { maskAssetKey?: string }
}

/**
 * The purchase-time freeze + render kickoff (FR-029/FR-030, Principle II, SC-002).
 * Every line carrying `metadata.design_id` gets an order_line_design row (design +
 * schema version snapshotted, per-line withdrawal right stored, never recomputed), and —
 * when the photo is ready — a self-contained render job goes onto the gl:render queue:
 * the frozen schema, the engine-shaped design (face id rewritten to its R2 cutout key)
 * and every asset key the renderer needs. No Redis configured → freeze still happens,
 * enqueue is skipped with a log.
 */
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve('logger')
  const orders: IOrderModuleService = container.resolve(Modules.ORDER)
  const personalization: PersonalizationModuleService = container.resolve(PERSONALIZATION_MODULE)
  const schemas: ProductCustomizationModuleService = container.resolve(PRODUCT_CUSTOMIZATION_MODULE)

  const order = await orders.retrieveOrder(data.id, { relations: ['items'] })
  let frozen = 0

  for (const item of order.items ?? []) {
    const designId = (item.metadata as Record<string, unknown> | null)?.design_id
    if (typeof designId !== 'string' || !designId) continue

    try {
      const design = await personalization.retrieveDesignState(designId)
      const line = await personalization.attachDesignToLine({
        medusa_line_item_id: item.id,
        design_state_id: designId,
        schema_version: design.schema_version,
        withdrawal_notice_version: 'v1',
      })
      frozen += 1
      logger.info(
        `[gl] order ${order.display_id ?? order.id}: line ${item.id} frozen (design ${designId}, withdrawal ${line.withdrawal_right}, render ${line.render_status})`,
      )

      // render job — only when the photo side is settled (deferred waits for the photo)
      if (line.render_status !== 'queued') continue

      // schema rows are keyed by the MEDUSA product id (the line item carries it);
      // design.product_schema_id is the engine document id and is only a fallback
      const schemaProductId =
        ((item as unknown as { product_id?: string | null }).product_id ?? design.product_schema_id) as string
      const schemaRow = await schemas.getActiveSchema(schemaProductId)
      if (!schemaRow) {
        logger.warn(`[gl] order ${order.id}: no active schema for ${schemaProductId} — render skipped`)
        continue
      }
      const schemaDoc = schemaRow.definition as SchemaDoc

      // asset keys: artwork + mask (+ the customer's cutout, face id rewritten to its R2 key)
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
        if (!faceKey) {
          logger.warn(`[gl] order ${order.id}: line ${item.id} photo ${fl.uploaded_photo_id} has no ready cutout — render skipped`)
          continue
        }
        assetKeys.add(`/${faceKey}`.replace(/^\/+/, '/'))
        engineFace = {
          uploadedPhotoId: `/${faceKey}`.replace(/^\/+/, '/'),
          x: fl.x ?? 0,
          y: fl.y ?? 0,
          scale: fl.scale ?? 1,
          rotation: fl.rotation ?? 0,
        }
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
        orderId: order.id,
        orderDisplayId: (order.display_id as number | undefined) ?? null,
        lineItemId: item.id,
        designStateId: designId,
        schema: schemaRow.definition as Record<string, unknown>,
        design: engineDesign,
        assetKeys: [...assetKeys],
      })
      logger.info(
        queued
          ? `[gl] order ${order.display_id ?? order.id}: render job queued for line ${item.id}`
          : `[gl] order ${order.display_id ?? order.id}: no Redis — render job NOT queued for line ${item.id}`,
      )
    } catch (e) {
      // idempotency: a retried event hits the unique medusa_line_item_id constraint
      logger.warn(`[gl] order ${order.id}: line ${item.id} not frozen — ${(e as Error).message}`)
    }
  }

  if (frozen === 0) {
    logger.info(`[gl] order ${order.display_id ?? order.id}: no personalized lines`)
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed',
}

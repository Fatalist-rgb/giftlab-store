import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { IOrderModuleService } from '@medusajs/framework/types'
import { faceAutoFit } from '@gl/constructor-vendored'
import { PERSONALIZATION_MODULE } from '../../../../../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../../../../../modules/personalization/service'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../../../../../../../../modules/product_customization'
import type ProductCustomizationModuleService from '../../../../../../../../modules/product_customization/service'
import { enqueueRenderForLine } from '../../../../../../../../lib/render-jobs'

type ClientFaceBox = { x: number; y: number; w: number; h: number; imgW: number; imgH: number }

/** browser-detected face box: finite, positive sizes, inside the photo (loose tolerance) */
function validFaceBox(b: unknown): b is ClientFaceBox {
  if (!b || typeof b !== 'object') return false
  const v = b as Record<string, unknown>
  const nums = ['x', 'y', 'w', 'h', 'imgW', 'imgH'].map((k) => v[k])
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return false
  const { x, y, w, h, imgW, imgH } = v as ClientFaceBox
  if (w <= 0 || h <= 0 || imgW <= 0 || imgH <= 0) return false
  if (imgW > 20000 || imgH > 20000) return false
  // the box must lie (roughly) within the photo
  return x > -imgW && y > -imgH && x + w < imgW * 2 && y + h < imgH * 2
}

/**
 * POST /store/gl/orders/:orderId/lines/:lineItemId/photo — "order now, send the photo
 * later" completes here (FR-013 / T049). Attaches a finalized upload (cutout ready) to
 * an awaiting_photo line: the frozen design gets the face layer, the line flips to
 * queued and the render job is enqueued through the same shared path as order.placed.
 * Body: { uploadId }. Order/line ids are unguessable ULIDs; a signed email link can
 * tighten this further when notifications land.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { orderId, lineItemId } = req.params
  const { uploadId, faceBox } = (req.body ?? {}) as { uploadId?: string; faceBox?: unknown }
  if (!uploadId) return res.status(400).json({ message: 'uploadId is required' })

  const orders: IOrderModuleService = req.scope.resolve(Modules.ORDER)
  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)

  // the line must belong to the order
  let order
  try {
    order = await orders.retrieveOrder(orderId, { relations: ['items'] })
  } catch {
    return res.status(404).json({ message: 'order not found' })
  }
  const item = (order.items ?? []).find((i) => i.id === lineItemId)
  if (!item) return res.status(404).json({ message: 'line not found in this order' })

  const [line] = await personalization.listOrderLineDesigns({ medusa_line_item_id: lineItemId })
  if (!line) return res.status(404).json({ message: 'no design frozen on this line' })
  if (line.render_status !== 'awaiting_photo') {
    return res.status(409).json({ message: `line is ${line.render_status}, not awaiting_photo` })
  }

  // the upload must be finalized with a ready cutout
  let photo
  try {
    photo = await personalization.retrieveUploadedPhoto(uploadId)
  } catch {
    return res.status(404).json({ message: 'upload not found' })
  }
  // "skipped" = the browser could not remove the background and the customer continued
  // anyway; the face zone is masked, so the order proceeds and the operator is warned.
  if (photo.status !== 'active' || !['ready', 'skipped'].includes(photo.cutout_status ?? '')) {
    return res.status(409).json({ message: `upload cutout is ${photo.cutout_status}` })
  }

  // attach the face to the frozen design. With a browser-detected face box the head is
  // auto-centred in the face zone (same math as the constructor); centered otherwise.
  const schemaProductIdForFit =
    ((item as unknown as { product_id?: string | null }).product_id ?? '') as string
  let placement = { x: 0, y: 0, scale: 1, rotation: 0 }
  if (validFaceBox(faceBox)) {
    const schemas: ProductCustomizationModuleService = req.scope.resolve(PRODUCT_CUSTOMIZATION_MODULE)
    const schemaRow = await schemas.getActiveSchema(schemaProductIdForFit)
    const bounds = (schemaRow?.definition as { faceZone?: { bounds?: { w: number; h: number } } } | undefined)
      ?.faceZone?.bounds
    if (bounds) {
      const fit = faceAutoFit({
        imgW: faceBox.imgW,
        imgH: faceBox.imgH,
        faceBox: { x: faceBox.x, y: faceBox.y, w: faceBox.w, h: faceBox.h },
        zoneW: bounds.w,
        zoneH: bounds.h,
        minScale: 0.6,
        maxScale: 2.6,
      })
      placement = { x: fit.x, y: fit.y, scale: fit.scale, rotation: 0 }
    }
  }
  await personalization.updateDesignStates([
    {
      id: line.design_state_id,
      face_layer: { uploaded_photo_id: uploadId, ...placement },
      photo_status: 'ready',
      is_personalized: true,
    },
  ])
  await personalization.updateOrderLineDesigns([{ id: line.id, render_status: 'queued' }])

  const schemaProductId =
    ((item as unknown as { product_id?: string | null }).product_id ?? '') as string
  const result = await enqueueRenderForLine(req.scope, {
    orderId: order.id,
    orderDisplayId: (order.display_id as number | undefined) ?? null,
    lineItemId,
    designStateId: line.design_state_id,
    schemaProductId,
  })

  if (!result.ok) {
    return res.status(409).json({ message: `render not queued: ${result.reason}` })
  }
  res.json({ ok: true, renderStatus: 'queued', jobQueued: result.queued })
}

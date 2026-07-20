import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { IOrderModuleService } from '@medusajs/framework/types'
import { PERSONALIZATION_MODULE } from '../../../../../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../../../../../modules/personalization/service'
import { enqueueRenderForLine } from '../../../../../../../../lib/render-jobs'

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
  const { uploadId } = (req.body ?? {}) as { uploadId?: string }
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
  if (photo.status !== 'active' || photo.cutout_status !== 'ready') {
    return res.status(409).json({ message: `upload cutout is ${photo.cutout_status}` })
  }

  // attach the face to the frozen design (centered; placement was decided pre-order)
  await personalization.updateDesignStates([
    {
      id: line.design_state_id,
      face_layer: { uploaded_photo_id: uploadId, x: 0, y: 0, scale: 1, rotation: 0 },
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

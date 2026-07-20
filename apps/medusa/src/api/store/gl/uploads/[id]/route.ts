import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PERSONALIZATION_MODULE } from '../../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../../modules/personalization/service'

/** GET /store/gl/uploads/:id — upload/cutout status for constructor polling (T034). */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)
  try {
    const photo = await personalization.retrieveUploadedPhoto(id)
    res.json({
      uploadId: photo.id,
      status: photo.status,
      cutoutStatus: photo.cutout_status,
      widthPx: photo.width_px,
      heightPx: photo.height_px,
    })
  } catch {
    res.status(404).json({ message: `upload not found: ${id}` })
  }
}

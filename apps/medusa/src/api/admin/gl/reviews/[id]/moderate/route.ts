import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { REVIEW_MODULE } from '../../../../../../modules/review'
import type ReviewModuleService from '../../../../../../modules/review/service'

/** POST /admin/gl/reviews/:id/moderate { decision: "published" | "rejected" }. */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { decision } = (req.body ?? {}) as { decision?: string }
  if (decision !== 'published' && decision !== 'rejected') {
    return res.status(400).json({ message: 'decision must be "published" or "rejected"' })
  }
  const reviews: ReviewModuleService = req.scope.resolve(REVIEW_MODULE)
  try {
    const row = await reviews.moderate(id, decision)
    res.json({ ok: true, id: row.id, status: row.status })
  } catch {
    res.status(404).json({ message: `review not found: ${id}` })
  }
}

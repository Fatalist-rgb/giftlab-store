import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PERSONALIZATION_MODULE } from '../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../modules/personalization/service'

/**
 * GET /admin/gl/funnel?days=30 — constructor funnel from OUR OWN data (T071b):
 * persisted designs (an add-to-cart click) vs frozen order lines (a paid order).
 * Independent of GA consent rates, so the ratio is real even with low opt-in.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days ?? 30)))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)
  const [designs, lines] = await Promise.all([
    personalization.listDesignStates({ created_at: { $gt: since } }, { select: ['id', 'is_personalized'], take: 10_000 }),
    personalization.listOrderLineDesigns({ created_at: { $gt: since } }, { select: ['id', 'withdrawal_right'], take: 10_000 }),
  ])

  const personalized = designs.filter((d) => d.is_personalized).length
  res.json({
    days,
    designsCreated: designs.length, // add-to-cart submissions
    personalizedShare: designs.length ? Math.round((personalized / designs.length) * 100) : null,
    orderLines: lines.length, // paid + frozen
    conversion: designs.length ? Math.round((lines.length / designs.length) * 100) : null,
  })
}

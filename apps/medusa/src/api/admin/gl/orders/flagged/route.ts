import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PERSONALIZATION_MODULE } from '../../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../../modules/personalization/service'

/**
 * GET /admin/gl/orders/flagged — the operator's problem list (T056): lines whose
 * production file is not ready. `failed` needs intervention, `awaiting_photo` waits on
 * the customer, `queued` without a package for over 10 minutes is stuck (a lost job —
 * requeue it). Newest first.
 */
const STUCK_MS = 10 * 60 * 1000

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)

  const lines = await personalization.listOrderLineDesigns(
    { render_status: ['failed', 'awaiting_photo', 'queued'] },
    { order: { created_at: 'DESC' }, take: 200 },
  )

  const now = Date.now()
  const flagged = lines
    .filter((l) => {
      if (l.render_status !== 'queued') return true
      const created = new Date(l.created_at as unknown as string).getTime()
      return !l.production_package_id && now - created > STUCK_MS
    })
    .map((l) => ({
      lineItemId: l.medusa_line_item_id,
      orderId: l.order_id ?? null,
      orderDisplayId: l.order_display_id ?? null,
      renderStatus: l.render_status === 'queued' ? 'stuck' : l.render_status,
      withdrawalRight: l.withdrawal_right,
      designStateId: l.design_state_id,
      createdAt: l.created_at,
    }))

  res.json({ count: flagged.length, lines: flagged })
}

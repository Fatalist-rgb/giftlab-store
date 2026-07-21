import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { CONTENT_MODULE } from '../../../../../modules/content'
import type ContentModuleService from '../../../../../modules/content/service'
import { WITHDRAWAL_NOTICE_TEXT, WITHDRAWAL_NOTICE_VERSION } from '../../../../../lib/legal'

/**
 * GET /store/gl/legal/withdrawal-notice?locale=pl|en|uk — the versioned withdrawal
 * notice the checkout renders beside the pay button (T064). An admin-edited content
 * page (slug `withdrawal-notice`) overrides the built-in text; the version is the one
 * frozen per order line at purchase.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const locale = (['pl', 'en', 'uk'].includes(String(req.query.locale)) ? req.query.locale : 'pl') as
    | 'pl'
    | 'en'
    | 'uk'

  const content: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const page = await content.getPage('withdrawal-notice', locale)

  const fallback = WITHDRAWAL_NOTICE_TEXT[locale]
  res.json({
    version: WITHDRAWAL_NOTICE_VERSION,
    locale,
    title: page?.title ?? fallback.title,
    body: page?.body ?? fallback.body,
    source: page ? 'content' : 'builtin',
  })
}

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { CONTENT_MODULE } from '../../../../../modules/content'
import type ContentModuleService from '../../../../../modules/content/service'

/**
 * GET /store/gl/content/:slug?locale=pl|en|uk
 * An admin-editable content / legal page. A missing en/uk translation transparently
 * falls back to Polish (FR-036).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { slug } = req.params
  const locale = (req.query.locale as string) || 'pl'
  const allowed = ['pl', 'en', 'uk']
  const svc: ContentModuleService = req.scope.resolve(CONTENT_MODULE)

  const page = await svc.getPage(slug, (allowed.includes(locale) ? locale : 'pl') as 'pl' | 'en' | 'uk')
  if (!page) {
    return res.status(404).json({ message: `content page not found: ${slug}` })
  }

  res.json({
    slug: page.slug,
    locale: page.locale,
    title: page.title,
    body: page.body,
    meta_title: page.meta_title,
    meta_description: page.meta_description,
  })
}

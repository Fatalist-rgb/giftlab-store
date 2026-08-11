import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { CONTENT_MODULE } from '../../../../modules/content'
import type ContentModuleService from '../../../../modules/content/service'

export type HeroSlideDoc = {
  image: string
  badge: Record<string, string>
  title: Record<string, string>
  sub: Record<string, string>
  badgeBg: 'mandarin' | 'lime' | 'pink' | 'blue'
  pos?: string
  enabled?: boolean
}

/**
 * GET /store/gl/hero — the admin-managed hero slides. Stored as ONE JSON document
 * in the content module (slug `hero-slides`, base locale pl) so the shop owner
 * edits them from the admin without a deploy; per-field {pl,en,uk} maps let the
 * storefront pick the visitor's language with a pl fallback.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const content: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  try {
    const page = await content.getPage('hero-slides', 'pl')
    const slides = (JSON.parse(page?.body ?? '[]') as HeroSlideDoc[]).filter(
      (s) => s && s.image && s.enabled !== false,
    )
    res.json({ slides })
  } catch {
    res.json({ slides: [] })
  }
}

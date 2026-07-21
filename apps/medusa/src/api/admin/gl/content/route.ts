import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { CONTENT_MODULE } from '../../../../modules/content'
import type ContentModuleService from '../../../../modules/content/service'

/**
 * Admin content editing (the missing half of T063).
 * GET  /admin/gl/content — all pages grouped by slug/locale.
 * POST /admin/gl/content — upsert one page { slug, locale, title, body, meta_title?, meta_description? }.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const content: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const pages = await content.listContentPages({}, { order: { slug: 'ASC' }, take: 200 })
  res.json({
    pages: pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      locale: p.locale,
      title: p.title,
      body: p.body,
      updatedAt: p.updated_at,
    })),
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as {
    slug?: string
    locale?: 'pl' | 'en' | 'uk'
    title?: string
    body?: string
    meta_title?: string
    meta_description?: string
  }
  if (!body.slug || !body.locale || !body.title || !body.body) {
    return res.status(400).json({ message: 'slug, locale, title and body are required' })
  }
  if (!['pl', 'en', 'uk'].includes(body.locale)) {
    return res.status(400).json({ message: 'locale must be pl|en|uk' })
  }
  const content: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const page = await content.upsertPage({
    slug: body.slug.trim().toLowerCase(),
    locale: body.locale,
    title: body.title,
    body: body.body,
    meta_title: body.meta_title ?? null,
    meta_description: body.meta_description ?? null,
  })
  res.json({ ok: true, id: page.id, slug: page.slug, locale: page.locale })
}

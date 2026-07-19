import { MedusaService } from '@medusajs/framework/utils'
import ContentPage from './models/content-page'

export const BASE_LOCALE = 'pl'
export type PageLocale = 'pl' | 'en' | 'uk'

/**
 * Serves and stores admin-editable content/legal pages. Polish is the required base;
 * a missing en/uk translation transparently falls back to pl (FR-036).
 */
class ContentModuleService extends MedusaService({ ContentPage }) {
  /**
   * Fetch a page for a locale, falling back to the Polish base when the requested
   * translation does not exist. Returns null only if not even the base exists.
   */
  async getPage(slug: string, locale: PageLocale = BASE_LOCALE) {
    const [requested] = await this.listContentPages({ slug, locale }, { take: 1 })
    if (requested) return requested
    if (locale === BASE_LOCALE) return null
    const [base] = await this.listContentPages({ slug, locale: BASE_LOCALE }, { take: 1 })
    return base ?? null
  }

  /** Create or update the page for (slug, locale). */
  async upsertPage(input: {
    slug: string
    locale: PageLocale
    title: string
    body: string
    meta_title?: string | null
    meta_description?: string | null
  }) {
    const [existing] = await this.listContentPages(
      { slug: input.slug, locale: input.locale },
      { take: 1 },
    )
    if (existing) {
      const [updated] = await this.updateContentPages([{ id: existing.id, ...input }])
      return updated
    }
    const [created] = await this.createContentPages([input])
    return created
  }
}

export default ContentModuleService

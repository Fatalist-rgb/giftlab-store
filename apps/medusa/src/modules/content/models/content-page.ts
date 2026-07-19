import { model } from '@medusajs/framework/utils'

/**
 * An admin-editable content / legal page, one row per (slug, locale) (FR-036).
 * Polish is the required base locale; en/uk fall back to pl when a translation is
 * missing (see service.getPage). Slugs: regulamin, privacy, cookies, zwroty,
 * dostawa, kontakt.
 */
const ContentPage = model
  .define('content_page', {
    id: model.id().primaryKey(),
    slug: model.text().index(),
    locale: model.enum(['pl', 'en', 'uk']),
    title: model.text(),
    body: model.text(),
    meta_title: model.text().nullable(),
    meta_description: model.text().nullable(),
  })
  .indexes([{ on: ['slug', 'locale'], unique: true }])

export default ContentPage

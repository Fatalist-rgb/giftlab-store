import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { REVIEW_MODULE } from '../modules/review'
import type ReviewModuleService from '../modules/review/service'
import { CONTENT_MODULE } from '../modules/content'
import type ContentModuleService from '../modules/content/service'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../modules/product_customization'
import type ProductCustomizationModuleService from '../modules/product_customization/service'
import { PERSONALIZATION_MODULE } from '../modules/personalization'
import type PersonalizationModuleService from '../modules/personalization/service'

/** Read-only smoke over every admin-facing section: does each service answer and
 *  does it have data to show? Run: npx medusa exec ./src/scripts/admin-smoke.ts */
export default async function ({ container }: ExecArgs) {
  const out: string[] = []
  const products = container.resolve(Modules.PRODUCT)
  const orders = container.resolve(Modules.ORDER)
  const users = container.resolve(Modules.USER)

  const [, prodCount] = await products.listAndCountProducts({}, { take: 1 })
  const published = (await products.listProducts({ status: ['published'] }, { take: 100 })).length
  const [, catCount] = await products.listAndCountProductCategories({}, { take: 1 })
  out.push(`products: ${prodCount} (published ${published}) | categories: ${catCount}`)

  const [, orderCount] = await orders.listAndCountOrders({}, { take: 1 })
  out.push(`orders: ${orderCount}`)

  const admins = await users.listUsers({}, { take: 10 })
  out.push(`admin users: ${admins.length} (${admins.map((u) => u.email).join(', ')})`)

  const reviews: ReviewModuleService = container.resolve(REVIEW_MODULE)
  const all = await reviews.listReviews({}, { take: 100 })
  const byStatus: Record<string, number> = {}
  for (const r of all) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
  out.push(`reviews: ${all.length} ${JSON.stringify(byStatus)}`)

  const content: ContentModuleService = container.resolve(CONTENT_MODULE)
  const pages = await content.listContentPages({}, { take: 100 })
  out.push(`content pages: ${pages.length} (${pages.slice(0, 6).map((p: { slug: string }) => p.slug).join(', ')}…)`)

  const schemas: ProductCustomizationModuleService = container.resolve(PRODUCT_CUSTOMIZATION_MODULE)
  const [flag] = await products.listProducts({ handle: 'figurka-z-brzuszkiem' })
  const active = flag ? await schemas.getActiveSchema(flag.id) : null
  out.push(`constructor schema: ${active ? 'published v' + active.version : 'MISSING'}`)

  const pers: PersonalizationModuleService = container.resolve(PERSONALIZATION_MODULE)
  const designs = await pers.listDesignStates({}, { take: 1000 })
  out.push(`designs saved: ${designs.length}`)

  console.log('\n=== ADMIN SMOKE ===\n' + out.join('\n'))
}

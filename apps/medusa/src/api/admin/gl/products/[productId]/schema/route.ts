import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { IProductModuleService } from '@medusajs/framework/types'
import type { MedusaContainer } from '@medusajs/framework'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../../../../../../modules/product_customization'
import type ProductCustomizationModuleService from '../../../../../../modules/product_customization/service'
import { PRICE_HISTORY_MODULE } from '../../../../../../modules/price_history'
import type PriceHistoryModuleService from '../../../../../../modules/price_history/service'

/** id or handle -> the real Medusa product id; null when the product does not exist. */
async function resolveProductId(container: MedusaContainer, idOrHandle: string): Promise<string | null> {
  const products: IProductModuleService = container.resolve(Modules.PRODUCT)
  const [byId] = await products.listProducts({ id: idOrHandle }, { take: 1 })
  if (byId) return byId.id
  const [byHandle] = await products.listProducts({ handle: idOrHandle }, { take: 1 })
  return byHandle?.id ?? null
}

/**
 * Admin schema lifecycle (T057).
 * GET  /admin/gl/products/:productId/schema — the active published version.
 * POST /admin/gl/products/:productId/schema — publish a new immutable version: the
 * engine validates the full contract INCLUDING the free-default invariant (422 on a
 * paid default — a legal rule, not editorial discipline), the previous version is
 * archived, and the base price is snapshotted into the Omnibus history (FR-039).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { productId } = req.params
  const realId = await resolveProductId(req.scope, productId)
  if (!realId) return res.status(404).json({ message: `product not found: ${productId}` })
  const schemas: ProductCustomizationModuleService = req.scope.resolve(PRODUCT_CUSTOMIZATION_MODULE)
  const active = await schemas.getActiveSchema(realId)
  if (!active) return res.status(404).json({ message: `no published schema for ${productId}` })
  res.json({ version: active.version, publishedAt: active.published_at, schema: active.definition })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { productId } = req.params
  const body = (req.body ?? {}) as { schema?: unknown }
  if (!body.schema || typeof body.schema !== 'object') {
    return res.status(400).json({ message: 'a schema document is required' })
  }

  // publishing against a nonexistent product would create a stray schema timeline
  const realId = await resolveProductId(req.scope, productId)
  if (!realId) return res.status(404).json({ message: `product not found: ${productId}` })

  const schemas: ProductCustomizationModuleService = req.scope.resolve(PRODUCT_CUSTOMIZATION_MODULE)
  let published
  try {
    published = await schemas.publishSchema(realId, body.schema)
  } catch (e) {
    // FreeDefaultViolation and shape errors are publication errors, not server faults
    return res.status(422).json({ message: 'schema rejected', detail: (e as Error).message })
  }

  // Omnibus: keep the price timeline in step with what the schema now charges
  const base = (body.schema as { pricingRules?: { base?: number } }).pricingRules?.base
  if (typeof base === 'number') {
    const prices: PriceHistoryModuleService = req.scope.resolve(PRICE_HISTORY_MODULE)
    await prices.recordPrice({ medusa_product_id: realId, price: base })
  }

  res.status(201).json({ version: published.version, status: published.status })
}

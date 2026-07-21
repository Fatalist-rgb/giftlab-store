import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../../../../../../modules/product_customization'
import type ProductCustomizationModuleService from '../../../../../../modules/product_customization/service'
import { PRICE_HISTORY_MODULE } from '../../../../../../modules/price_history'
import type PriceHistoryModuleService from '../../../../../../modules/price_history/service'

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
  const schemas: ProductCustomizationModuleService = req.scope.resolve(PRODUCT_CUSTOMIZATION_MODULE)
  const active = await schemas.getActiveSchema(productId)
  if (!active) return res.status(404).json({ message: `no published schema for ${productId}` })
  res.json({ version: active.version, publishedAt: active.published_at, schema: active.definition })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { productId } = req.params
  const body = (req.body ?? {}) as { schema?: unknown }
  if (!body.schema || typeof body.schema !== 'object') {
    return res.status(400).json({ message: 'a schema document is required' })
  }

  const schemas: ProductCustomizationModuleService = req.scope.resolve(PRODUCT_CUSTOMIZATION_MODULE)
  let published
  try {
    published = await schemas.publishSchema(productId, body.schema)
  } catch (e) {
    // FreeDefaultViolation and shape errors are publication errors, not server faults
    return res.status(422).json({ message: 'schema rejected', detail: (e as Error).message })
  }

  // Omnibus: keep the price timeline in step with what the schema now charges
  const base = (body.schema as { pricingRules?: { base?: number } }).pricingRules?.base
  if (typeof base === 'number') {
    const prices: PriceHistoryModuleService = req.scope.resolve(PRICE_HISTORY_MODULE)
    await prices.recordPrice({ medusa_product_id: productId, price: base })
  }

  res.status(201).json({ version: published.version, status: published.status })
}

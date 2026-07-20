import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { resolveActiveSchema } from '../../../resolve-schema'

/**
 * GET /store/gl/products/:productId/schema
 * The active published ProductSchema for a product — what the storefront constructor
 * loads. `:productId` is either a Medusa product id (prod_…) or a product handle
 * ("figurka-z-brzuszkiem"), so storefront URLs can stay human-readable.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { productId } = req.params
  const active = await resolveActiveSchema(req.scope, productId)

  if (!active) {
    return res.status(404).json({ message: `no published schema for product ${productId}` })
  }

  res.json({ version: active.version, schema: active.definition })
}

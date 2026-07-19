import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../../../../../../modules/product_customization'
import type ProductCustomizationModuleService from '../../../../../../modules/product_customization/service'

/**
 * GET /store/gl/products/:productId/schema
 * The active published ProductSchema for a product — what the storefront constructor loads.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { productId } = req.params
  const svc: ProductCustomizationModuleService = req.scope.resolve(PRODUCT_CUSTOMIZATION_MODULE)

  const active = await svc.getActiveSchema(productId)
  if (!active) {
    return res.status(404).json({ message: `no published schema for product ${productId}` })
  }

  res.json({ version: active.version, schema: active.definition })
}

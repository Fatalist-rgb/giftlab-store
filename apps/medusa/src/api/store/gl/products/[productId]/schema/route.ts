import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { IProductModuleService } from '@medusajs/framework/types'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../../../../../../modules/product_customization'
import type ProductCustomizationModuleService from '../../../../../../modules/product_customization/service'

/**
 * GET /store/gl/products/:productId/schema
 * The active published ProductSchema for a product — what the storefront constructor
 * loads. `:productId` is either a Medusa product id (prod_…) or a product handle
 * ("figurka-z-brzuszkiem"), so storefront URLs can stay human-readable.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { productId } = req.params
  const svc: ProductCustomizationModuleService = req.scope.resolve(PRODUCT_CUSTOMIZATION_MODULE)

  let active = await svc.getActiveSchema(productId)

  if (!active) {
    // not a raw product id — try resolving it as a handle
    const products: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
    const [byHandle] = await products.listProducts({ handle: productId }, { take: 1 })
    if (byHandle) {
      active = await svc.getActiveSchema(byHandle.id)
    }
  }

  if (!active) {
    return res.status(404).json({ message: `no published schema for product ${productId}` })
  }

  res.json({ version: active.version, schema: active.definition })
}

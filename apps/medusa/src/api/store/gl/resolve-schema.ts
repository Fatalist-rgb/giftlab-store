import type { MedusaContainer } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'
import type { IProductModuleService } from '@medusajs/framework/types'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../../../modules/product_customization'
import type ProductCustomizationModuleService from '../../../modules/product_customization/service'

/**
 * Resolve `idOrHandle` (Medusa product id or handle) to the product's active published
 * constructor schema row. Returns null when neither resolves — the shared lookup for
 * every /store/gl route that needs the schema.
 */
export async function resolveActiveSchema(container: MedusaContainer, idOrHandle: string) {
  const schemas: ProductCustomizationModuleService = container.resolve(PRODUCT_CUSTOMIZATION_MODULE)

  let active = await schemas.getActiveSchema(idOrHandle)
  if (active) return active

  const products: IProductModuleService = container.resolve(Modules.PRODUCT)
  const [byHandle] = await products.listProducts({ handle: idOrHandle }, { take: 1 })
  if (!byHandle) return null
  return schemas.getActiveSchema(byHandle.id)
}

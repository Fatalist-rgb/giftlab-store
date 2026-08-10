import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

/**
 * One-off: switch a product's variants to manage_inventory=false (made-to-order
 * goods, no stock locations configured). Usage:
 *   GL_FIX_HANDLE=kubek-test npx medusa exec ./src/scripts/fix-variant-inventory.ts
 */
export default async function ({ container }: ExecArgs) {
  const handle = process.env.GL_FIX_HANDLE
  if (!handle) throw new Error('GL_FIX_HANDLE is required')
  const products = container.resolve(Modules.PRODUCT)
  const [product] = await products.listProducts({ handle }, { relations: ['variants'] })
  if (!product) throw new Error(`product not found: ${handle}`)
  for (const v of product.variants ?? []) {
    await products.updateProductVariants(v.id, { manage_inventory: false })
    console.log(`manage_inventory=false: ${v.id} (${v.title})`)
  }
}

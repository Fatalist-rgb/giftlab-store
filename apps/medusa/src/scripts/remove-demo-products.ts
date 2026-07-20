import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

/**
 * Remove the demo products seeded by create-medusa-app (t-shirt, sweatshirt, sweatpants,
 * shorts) so the real catalogue shows only actual merchandise. Medusa soft-deletes
 * products, so this is reversible. Idempotent.
 */
const DEMO_HANDLES = ['t-shirt', 'sweatshirt', 'sweatpants', 'shorts']

export default async function ({ container }: ExecArgs) {
  const products = container.resolve(Modules.PRODUCT)
  const found = await products.listProducts({ handle: DEMO_HANDLES })
  if (!found.length) {
    console.log('no demo products found — nothing to do')
    return
  }
  await products.softDeleteProducts(found.map((p) => p.id))
  console.log(`soft-deleted ${found.length} demo products:`, found.map((p) => p.handle).join(', '))
}

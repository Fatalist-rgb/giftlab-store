import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { updateProductsWorkflow } from '@medusajs/medusa/core-flows'

/** One-off: the three early-phase placeholder figurines (superhero/pet/christmas)
 *  must not sell on the live catalogue — draft until real products exist. */
const HANDLES = ['figurka-superbohater', 'figurka-pupil', 'figurka-swiateczna']

export default async function ({ container }: ExecArgs) {
  const products = container.resolve(Modules.PRODUCT)
  for (const handle of HANDLES) {
    const [p] = await products.listProducts({ handle })
    if (!p) { console.log(`missing: ${handle}`); continue }
    await updateProductsWorkflow(container).run({
      input: { selector: { id: p.id }, update: { status: 'draft' as const } },
    })
    console.log(`→ draft: ${handle}`)
  }
}

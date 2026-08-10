import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

export default async function ({ container }: ExecArgs) {
  const products = container.resolve(Modules.PRODUCT)
  const list = await products.listProducts({ status: ['published'] }, { relations: ['categories'], take: 50 })
  for (const p of list) console.log(`${p.handle} | ${p.title} | cats: ${(p.categories ?? []).map((c) => c.name).join(',') || '—'}`)
}

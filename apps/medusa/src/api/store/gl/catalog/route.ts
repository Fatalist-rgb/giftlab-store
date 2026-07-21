import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { IProductModuleService } from '@medusajs/framework/types'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../../../../modules/product_customization'
import type ProductCustomizationModuleService from '../../../../modules/product_customization/service'

type CatalogItem = {
  id: string
  handle: string | null
  title: string
  description: string | null
  basePriceGrosz: number | null
  ladder: Array<{ minQty: number; unitPrice: number }>
  thumbnail: string | null
  variantCount: number
}

type CatalogCategory = {
  id: string
  name: string
  description: string | null
  products: CatalogItem[]
}

/**
 * GET /store/gl/catalog — the storefront catalogue in one round trip: active
 * categories with their published products, each carrying the base price and the
 * ladder from its ACTIVE constructor schema (the price authority) plus a thumbnail
 * (first variant's artwork). Products without a published schema are not orderable
 * and stay out of the list.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const products: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
  const schemas: ProductCustomizationModuleService = req.scope.resolve(PRODUCT_CUSTOMIZATION_MODULE)

  const categories = await products.listProductCategories(
    { is_active: true },
    // explicit select: the module returns a trimmed DTO by default and `name` is not in it
    { select: ['id', 'name', 'description'], order: { name: 'ASC' }, take: 50 },
  )
  const all = await products.listProducts(
    { status: ['published'] },
    { relations: ['categories'], take: 200 },
  )

  const byCategory = new Map<string, CatalogItem[]>()
  for (const p of all) {
    const active = await schemas.getActiveSchema(p.id)
    if (!active) continue
    const doc = active.definition as {
      pricingRules?: { base?: number; quantityLadder?: Array<{ minQty: number; unitPrice: number }> }
      characterLayers?: Array<{ variants?: Array<{ assetKey?: string }> }>
    }
    const item: CatalogItem = {
      id: p.id,
      handle: p.handle,
      title: p.title,
      description: p.description ?? null,
      basePriceGrosz: doc.pricingRules?.base ?? null,
      ladder: doc.pricingRules?.quantityLadder ?? [],
      thumbnail: doc.characterLayers?.[0]?.variants?.[0]?.assetKey ?? null,
      variantCount: doc.characterLayers?.[0]?.variants?.length ?? 0,
    }
    for (const c of p.categories ?? []) {
      const list = byCategory.get(c.id) ?? []
      list.push(item)
      byCategory.set(c.id, list)
    }
  }

  const out: CatalogCategory[] = []
  for (const cat of categories) {
    const items = byCategory.get(cat.id) ?? []
    if (!items.length) continue
    out.push({ id: cat.id, name: cat.name, description: cat.description ?? null, products: items })
  }

  res.json({ categories: out })
}

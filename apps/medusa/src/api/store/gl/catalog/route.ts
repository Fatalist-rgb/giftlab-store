import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules, QueryContext } from '@medusajs/framework/utils'
import type { IProductModuleService, IRegionModuleService } from '@medusajs/framework/types'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../../../../modules/product_customization'
import type ProductCustomizationModuleService from '../../../../modules/product_customization/service'

type CatalogItem = {
  id: string
  handle: string | null
  title: string
  description: string | null
  /** 'constructor' opens the builder; 'simple' opens the plain product page */
  kind: 'constructor' | 'simple'
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
 * categories with their published products. A product WITH an active constructor
 * schema is priced by that schema (the price authority) and opens the builder; a
 * product WITHOUT one is an ordinary shop item priced by its PLN price list and
 * opens the plain product page. That split is what lets the shop owner add goods
 * from the admin without touching code.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const products: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
  const schemas: ProductCustomizationModuleService = req.scope.resolve(PRODUCT_CUSTOMIZATION_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const regions: IRegionModuleService = req.scope.resolve(Modules.REGION)

  const categories = await products.listProductCategories(
    { is_active: true },
    // explicit select: the module returns a trimmed DTO by default and `name` is not in it
    { select: ['id', 'name', 'description', 'rank'], order: { rank: 'ASC' }, take: 50 },
  )

  const [region] = await regions.listRegions({ currency_code: 'pln' })
  const { data: all } = await query.graph({
    entity: 'product',
    fields: [
      'id', 'handle', 'title', 'description', 'thumbnail',
      'categories.id',
      'variants.id', 'variants.calculated_price.calculated_amount',
    ],
    filters: { status: 'published' },
    context: region
      ? { variants: { calculated_price: QueryContext({ region_id: region.id, currency_code: 'pln' }) } }
      : undefined,
    pagination: { take: 200, skip: 0 },
  })

  const byCategory = new Map<string, CatalogItem[]>()
  for (const p of all as Array<{
    id: string
    handle: string | null
    title: string
    description: string | null
    thumbnail: string | null
    categories?: Array<{ id: string }> | null
    variants?: Array<{ id: string; calculated_price?: { calculated_amount?: number | null } | null }> | null
  }>) {
    const active = await schemas.getActiveSchema(p.id)
    let item: CatalogItem
    if (active) {
      const doc = active.definition as {
        pricingRules?: { base?: number; quantityLadder?: Array<{ minQty: number; unitPrice: number }> }
        characterLayers?: Array<{ variants?: Array<{ assetKey?: string }> }>
      }
      item = {
        id: p.id,
        handle: p.handle,
        title: p.title,
        description: p.description ?? null,
        kind: 'constructor',
        basePriceGrosz: doc.pricingRules?.base ?? null,
        ladder: doc.pricingRules?.quantityLadder ?? [],
        thumbnail: doc.characterLayers?.[0]?.variants?.[0]?.assetKey ?? null,
        variantCount: doc.characterLayers?.[0]?.variants?.length ?? 0,
      }
    } else {
      // ordinary product: price list is the authority; skip silently when the admin
      // has not priced it yet — an unpriced product is not sellable
      const amount = p.variants?.find((v) => typeof v.calculated_price?.calculated_amount === 'number')
        ?.calculated_price?.calculated_amount
      if (typeof amount !== 'number') continue
      item = {
        id: p.id,
        handle: p.handle,
        title: p.title,
        description: p.description ?? null,
        kind: 'simple',
        basePriceGrosz: Math.round(amount * 100),
        ladder: [],
        thumbnail: p.thumbnail ?? null,
        variantCount: p.variants?.length ?? 0,
      }
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

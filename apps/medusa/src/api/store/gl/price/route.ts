import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../../../../modules/product_customization'
import type ProductCustomizationModuleService from '../../../../modules/product_customization/service'
import { parseProductSchema, computePrice, type DesignState } from '../../../../lib/gl-constructor'

type PriceRequestDesign = {
  quantity?: number
  characterSelections?: Record<string, string>
  selectedOptions?: Record<string, string>
  faceLayer?: unknown | null
  photoStatus?: string
  textValues?: Array<{ fieldId: string; value: string }>
}

/**
 * POST /store/gl/price — the single price authority (Constitution VIII). The server
 * recomputes the price from the published schema + submitted designs using the same
 * @gl/constructor engine the storefront previews with; the client value is never trusted.
 * Body: { productId, designs: [{ quantity, characterSelections, selectedOptions, ... }] }.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as { productId?: string; designs?: PriceRequestDesign[] }
  const { productId, designs } = body
  if (!productId || !Array.isArray(designs) || designs.length === 0) {
    return res.status(400).json({ message: 'productId and a non-empty designs[] are required' })
  }

  const svc: ProductCustomizationModuleService = req.scope.resolve(PRODUCT_CUSTOMIZATION_MODULE)
  const active = await svc.getActiveSchema(productId)
  if (!active) {
    return res.status(404).json({ message: `no published schema for product ${productId}` })
  }

  let schema
  try {
    schema = parseProductSchema(active.definition)
  } catch (e) {
    return res.status(500).json({ message: 'stored schema failed validation', detail: (e as Error).message })
  }

  const engineDesigns: DesignState[] = designs.map((d) => ({
    quantity: Math.max(1, Number(d.quantity) || 1),
    characterSelections: d.characterSelections ?? {},
    selectedOptions: d.selectedOptions ?? {},
    faceLayer: d.faceLayer ?? null,
    photoStatus: (d.photoStatus as DesignState['photoStatus']) ?? 'ready',
    textValues: Array.isArray(d.textValues) ? d.textValues : [],
  }))

  const price = computePrice(schema, engineDesigns)
  res.json({ price })
}

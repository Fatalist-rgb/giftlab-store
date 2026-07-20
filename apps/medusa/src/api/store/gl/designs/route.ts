import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PERSONALIZATION_MODULE } from '../../../../modules/personalization'
import type PersonalizationModuleService from '../../../../modules/personalization/service'
import { resolveActiveSchema } from '../resolve-schema'
import {
  parseProductSchema,
  parseDesignState,
  computePrice,
  computeWithdrawalRight,
  type DesignState,
} from '@gl/constructor-vendored'

/**
 * POST /store/gl/designs — persist a customer design with the price recomputed on the
 * server (Constitution VIII: never trust the client). The design is validated against the
 * published schema with the same engine the storefront previews with (bad variant/option/
 * text references are rejected), the price and per-line withdrawal right are computed
 * server-side, and the design is stored. Body: { productId, design }.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as { productId?: string; design?: unknown }
  const { productId, design } = body
  if (!productId || !design || typeof design !== 'object') {
    return res.status(400).json({ message: 'productId and a design object are required' })
  }

  const active = await resolveActiveSchema(req.scope, productId)
  if (!active) {
    return res.status(404).json({ message: `no published schema for product ${productId}` })
  }

  let schema
  let validated: DesignState
  try {
    schema = parseProductSchema(active.definition)
    validated = parseDesignState(design, schema) // throws on bad refs / shape / maxLen
  } catch (e) {
    return res.status(422).json({ message: 'invalid design', detail: (e as Error).message })
  }

  const price = computePrice(schema, [validated])
  const withdrawalRight = computeWithdrawalRight(validated)

  const fl = validated.faceLayer as
    | { uploadedPhotoId?: string | null; x?: number; y?: number; scale?: number; rotation?: number }
    | null

  const personalization: PersonalizationModuleService = req.scope.resolve(PERSONALIZATION_MODULE)
  const stored = await personalization.createDesign({
    product_schema_id: schema.id,
    schema_version: schema.version,
    character_selections: validated.characterSelections,
    face_layer: fl
      ? { uploaded_photo_id: fl.uploadedPhotoId ?? null, x: fl.x, y: fl.y, scale: fl.scale, rotation: fl.rotation }
      : null,
    text_values: validated.textValues.map((t) => ({ field_id: t.fieldId, value: t.value })),
    selected_options: validated.selectedOptions,
    quantity: validated.quantity,
    computed_price: price.total,
    photo_status: validated.photoStatus,
  })

  res.status(201).json({
    designId: stored.id,
    price,
    withdrawalRight,
    isPersonalized: stored.is_personalized,
  })
}

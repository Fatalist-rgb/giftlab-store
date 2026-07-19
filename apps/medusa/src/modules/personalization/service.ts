import { MedusaService } from '@medusajs/framework/utils'
import DesignState from './models/design-state'
import UploadedPhoto from './models/uploaded-photo'
import ProductionPackage from './models/production-package'
import OrderLineDesign from './models/order-line-design'
import { isPersonalized, withdrawalRightFor } from './validate'

type FaceLayer = { uploaded_photo_id?: string | null; x?: number; y?: number; scale?: number; rotation?: number }
type TextValue = { field_id: string; value: string; font?: string; color?: string }

/**
 * The personalization domain: customer designs, their uploaded photos, the produced
 * manufacturing packages, and the per-line design/legal snapshot on order lines.
 * MedusaService provides generated CRUD for each model; the methods below add the
 * domain rules (derived personalization flag, per-line withdrawal right).
 */
class PersonalizationModuleService extends MedusaService({
  DesignState,
  UploadedPhoto,
  ProductionPackage,
  OrderLineDesign,
}) {
  /** Create a design, deriving `is_personalized` from its face photo / text values. */
  async createDesign(input: {
    product_schema_id: string
    schema_version: number
    character_selections: Record<string, string>
    face_layer?: FaceLayer | null
    text_values?: TextValue[]
    selected_options?: Record<string, string>
    computed_price: number
    photo_status?: 'ready' | 'deferred' | 'processing' | 'failed'
  }) {
    const photo_status =
      input.photo_status ?? (input.face_layer?.uploaded_photo_id ? 'ready' : 'deferred')
    const personalized = isPersonalized({
      face_layer: input.face_layer,
      photo_status,
      text_values: input.text_values,
    })
    const [design] = await this.createDesignStates([
      {
        product_schema_id: input.product_schema_id,
        schema_version: input.schema_version,
        character_selections: input.character_selections,
        face_layer: input.face_layer ?? null,
        // model.json() types as Record<string, unknown>; this field holds an array (jsonb keeps it)
        text_values: (input.text_values ?? []) as unknown as Record<string, unknown>,
        selected_options: input.selected_options ?? {},
        computed_price: input.computed_price,
        photo_status,
        is_personalized: personalized,
      },
    ])
    return design
  }

  /**
   * Freeze a design onto a purchased order line: snapshot the schema version and
   * compute + store the per-line withdrawal right and the notice version shown.
   * Idempotent per line item (unique medusa_line_item_id).
   */
  async attachDesignToLine(input: {
    medusa_line_item_id: string
    design_state_id: string
    schema_version: number
    withdrawal_notice_version?: string
  }) {
    const design = await this.retrieveDesignState(input.design_state_id)
    const right = withdrawalRightFor({
      face_layer: design.face_layer as FaceLayer | null,
      photo_status: design.photo_status as string,
      text_values: design.text_values as Array<{ value?: string | null }> | null,
    })
    const [line] = await this.createOrderLineDesigns([
      {
        medusa_line_item_id: input.medusa_line_item_id,
        design_state_id: input.design_state_id,
        schema_version: input.schema_version,
        render_status: design.photo_status === 'deferred' ? 'awaiting_photo' : 'queued',
        withdrawal_right: right,
        withdrawal_notice_version: input.withdrawal_notice_version ?? null,
      },
    ])
    return line
  }
}

export default PersonalizationModuleService

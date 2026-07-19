import { MedusaService } from '@medusajs/framework/utils'
import ProductSchema from './models/product-schema'
import { assertFreeDefault } from './validate'

/**
 * Stores and serves the @gl/constructor ProductSchema per Medusa product.
 * MedusaService provides the generated CRUD (listProductSchemas, createProductSchemas, …);
 * the domain methods below add versioned publishing.
 */
class ProductCustomizationModuleService extends MedusaService({ ProductSchema }) {
  /**
   * Publish a new schema version for a product: enforce the free-default invariant,
   * bump the version, archive the previously-published schema, and store the new one
   * as the single active (published) schema.
   */
  async publishSchema(productId: string, definition: unknown) {
    assertFreeDefault(definition)

    const existing = await this.listProductSchemas({ product_id: productId })
    const nextVersion = existing.reduce((max, s) => Math.max(max, s.version), 0) + 1

    const published = existing.filter((s) => s.status === 'published')
    if (published.length) {
      await this.updateProductSchemas(
        published.map((s) => ({ id: s.id, status: 'archived' as const })),
      )
    }

    const [created] = await this.createProductSchemas([
      {
        product_id: productId,
        version: nextVersion,
        status: 'published',
        definition: definition as Record<string, unknown>,
        published_at: new Date(),
      },
    ])
    return created
  }

  /** The single active (published) schema for a product, or null if none is published. */
  async getActiveSchema(productId: string) {
    const [active] = await this.listProductSchemas(
      { product_id: productId, status: 'published' },
      { take: 1, order: { version: 'DESC' } },
    )
    return active ?? null
  }
}

export default ProductCustomizationModuleService

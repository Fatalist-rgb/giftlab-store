import { MedusaService } from '@medusajs/framework/utils'
import PriceEntry from './models/price-entry'
import { lowestPriceInPreviousDays } from './pricing'

/**
 * Records the price timeline per product/variant and answers the Omnibus question
 * (FR-039). No discounts are shown at launch, but the history must exist from day one
 * so the reference price is available the first time any reduction is displayed.
 */
class PriceHistoryModuleService extends MedusaService({ PriceEntry }) {
  /** Record a price point. No-op if the latest recorded price is unchanged. */
  async recordPrice(input: {
    medusa_product_id: string
    price: number
    variant_key?: string
    effective_from?: Date
  }) {
    const variant_key = input.variant_key ?? 'default'
    const [latest] = await this.listPriceEntries(
      { medusa_product_id: input.medusa_product_id, variant_key },
      { order: { effective_from: 'DESC' }, take: 1 },
    )
    if (latest && latest.price === input.price) return latest
    const [entry] = await this.createPriceEntries([
      {
        medusa_product_id: input.medusa_product_id,
        variant_key,
        price: input.price,
        effective_from: input.effective_from ?? new Date(),
      },
    ])
    return entry
  }

  /** Omnibus reference: the lowest price in the 30 days before `asOf` (FR-039), or null. */
  async lowestPriceInPrevious30Days(
    productId: string,
    variantKey = 'default',
    asOf: Date = new Date(),
  ): Promise<number | null> {
    const entries = await this.listPriceEntries(
      { medusa_product_id: productId, variant_key: variantKey },
      { order: { effective_from: 'ASC' }, take: 1000 },
    )
    return lowestPriceInPreviousDays(
      entries.map((e) => ({ price: e.price, effective_from: e.effective_from })),
      asOf,
    )
  }

  /** The current (latest) recorded price, or null. */
  async currentPrice(productId: string, variantKey = 'default'): Promise<number | null> {
    const [latest] = await this.listPriceEntries(
      { medusa_product_id: productId, variant_key: variantKey },
      { order: { effective_from: 'DESC' }, take: 1 },
    )
    return latest?.price ?? null
  }
}

export default PriceHistoryModuleService

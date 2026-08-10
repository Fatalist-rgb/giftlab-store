import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  updateProductsWorkflow,
} from '@medusajs/medusa/core-flows'

/**
 * Smoke-test product for the dynamic catalogue: one ordinary (non-constructor) item
 * in its own category, exactly the way the shop owner will add goods from the admin.
 * Run with GL_TEST_PRODUCT=publish|draft:
 *   npx medusa exec ./src/scripts/seed-test-product.ts
 */
const HANDLE = 'kubek-test'

export default async function ({ container }: ExecArgs) {
  const productSvc = container.resolve(Modules.PRODUCT)
  const channelSvc = container.resolve(Modules.SALES_CHANNEL)
  const mode = process.env.GL_TEST_PRODUCT === 'draft' ? 'draft' : 'published'

  let [product] = await productSvc.listProducts({ handle: HANDLE })
  if (product && mode === 'draft') {
    await updateProductsWorkflow(container).run({
      input: { selector: { id: product.id }, update: { status: 'draft' as const } },
    })
    console.log(`test product → draft (${product.id})`)
    return
  }
  if (product) {
    await updateProductsWorkflow(container).run({
      input: { selector: { id: product.id }, update: { status: 'published' as const } },
    })
    console.log(`test product → published (${product.id})`)
    return
  }

  let [category] = await productSvc.listProductCategories({ name: 'Akcesoria' })
  if (!category) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: [{ name: 'Akcesoria', is_active: true }] },
    })
    category = result[0]
    console.log('category created: Akcesoria')
  }

  const [channel] = await channelSvc.listSalesChannels({}, { take: 1 })
  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: 'Kubek testowy',
          handle: HANDLE,
          description: 'Produkt testowy dynamicznego katalogu — do usunięcia.',
          status: 'published' as const,
          category_ids: [category.id],
          ...(channel ? { sales_channels: [{ id: channel.id }] } : {}),
          thumbnail: 'https://mavorashop.eu/photos/made-belly.webp',
          options: [{ title: 'Wariant', values: ['Standard'] }],
          variants: [
            {
              title: 'Standard',
              sku: 'TEST-KUBEK-STD',
              options: { Wariant: 'Standard' },
              // no stock tracking at launch — the shop sells made-to-order goods;
              // leaving this on without a stock location breaks add-to-cart
              manage_inventory: false,
              prices: [{ amount: 39.99, currency_code: 'pln' }],
            },
          ],
        },
      ],
    },
  })
  console.log('test product created:', result[0].id)
}

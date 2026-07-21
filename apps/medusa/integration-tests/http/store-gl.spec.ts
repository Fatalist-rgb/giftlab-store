import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../../src/modules/product_customization'
import type ProductCustomizationModuleService from '../../src/modules/product_customization/service'
import { REVIEW_MODULE } from '../../src/modules/review'
import type ReviewModuleService from '../../src/modules/review/service'

jest.setTimeout(120_000)

const schemaDoc = {
  id: 'ps_it', medusaProductId: 'replaced-below', version: 1, status: 'published',
  canvasPx: { w: 304, h: 424 },
  characterLayers: [{
    id: 'body', zIndex: 10, label: { pl: 'Postać' },
    variants: [
      { id: 'blue', label: { pl: 'Niebieski' }, assetKey: 'art/body-blue.png', priceDelta: 0 },
      { id: 'pink', label: { pl: 'Różowy' }, assetKey: 'art/body-pink.png', priceDelta: 0 },
    ],
  }],
  faceZone: {
    bounds: { x: 92, y: 40, w: 120, h: 132 }, maskAssetKey: 'art/face-mask.png',
    minResolutionPx: { w: 900, h: 900 }, transforms: ['move', 'scale', 'rotate'], zIndex: 15,
  },
  textFields: [{ id: 'name', label: { pl: 'Imię' }, maxLen: 14, fonts: ['Bricolage Grotesque'], colors: ['#17131A'], placement: 'figure', zIndex: 100 }],
  options: [],
  physical: { heightMm: 110, magneticBacking: true, material: 'acrylic+silicone' },
  pricingRules: {
    base: 7900, currency: 'PLN',
    quantityLadder: [
      { minQty: 1, unitPrice: 7900 },
      { minQty: 3, unitPrice: 6500 },
      { minQty: 6, unitPrice: 4900 },
    ],
  },
  cutContour: { source: 'composite', offsetMm: 3, spotName: 'CutContour' },
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe('store /gl contract (T028)', () => {
      let headers: Record<string, string>
      let handle: string

      beforeAll(async () => {
        const container = getContainer()

        // a product the schema hangs off (resolved by id or handle), with a made-to-order
        // variant + PLN region + sales channel so the cart routes work in the bare test DB
        const products = container.resolve(Modules.PRODUCT)
        const [product] = await products.createProducts([
          { title: 'Figurka IT', handle: 'figurka-it', status: 'published' },
        ])
        handle = product.handle as string
        await products.createProductVariants([
          { product_id: product.id, title: 'Std', sku: 'FIG-IT-STD', manage_inventory: false },
        ])
        const regions = container.resolve(Modules.REGION)
        await regions.createRegions([{ name: 'Polska IT', currency_code: 'pln', countries: ['pl'] }])
        const channels = container.resolve(Modules.SALES_CHANNEL)
        const existing = await channels.listSalesChannels({}, { take: 1 })
        if (!existing.length) await channels.createSalesChannels([{ name: 'IT Channel' }])

        const schemas: ProductCustomizationModuleService = container.resolve(PRODUCT_CUSTOMIZATION_MODULE)
        await schemas.publishSchema(product.id, { ...schemaDoc, medusaProductId: product.id })

        // /store/* requires a publishable key
        const apiKeys = container.resolve(Modules.API_KEY)
        const [key] = await apiKeys.createApiKeys([
          { title: 'it', type: 'publishable', created_by: 'test' },
        ])
        headers = { 'x-publishable-api-key': key.token }
      })

      it('GET schema by handle -> 200 with the published document', async () => {
        const res = await api.get(`/store/gl/products/${handle}/schema`, { headers })
        expect(res.status).toBe(200)
        expect(res.data.version).toBe(1)
        expect(res.data.schema.pricingRules.base).toBe(7900)
      })

      it('GET schema for an unknown product -> 404', async () => {
        const res = await api
          .get('/store/gl/products/nie-ma-takiego/schema', { headers })
          .catch((e: { response: { status: number } }) => e.response)
        expect(res.status).toBe(404)
      })

      it('POST price applies the ladder across designs (3 szt -> 6500)', async () => {
        const res = await api.post(
          '/store/gl/price',
          {
            productId: handle,
            designs: [
              { quantity: 2, characterSelections: { body: 'blue' } },
              { quantity: 1, characterSelections: { body: 'pink' } },
            ],
          },
          { headers },
        )
        expect(res.status).toBe(200)
        expect(res.data.price.ladderUnitPrice).toBe(6500)
        expect(res.data.price.total).toBe(19500)
      })

      it('POST price without designs -> 400', async () => {
        const res = await api
          .post('/store/gl/price', { productId: handle, designs: [] }, { headers })
          .catch((e: { response: { status: number } }) => e.response)
        expect(res.status).toBe(400)
      })

      it('POST designs persists a valid design and computes the withdrawal right', async () => {
        const res = await api.post(
          '/store/gl/designs',
          {
            productId: handle,
            design: {
              productSchemaId: 'ps_it', schemaVersion: 1,
              characterSelections: { body: 'pink' },
              faceLayer: null,
              textValues: [{ fieldId: 'name', value: 'Zosia' }],
              selectedOptions: {}, quantity: 2, photoStatus: 'deferred',
            },
          },
          { headers },
        )
        expect(res.status).toBe(201)
        expect(res.data.designId).toBeTruthy()
        expect(res.data.withdrawalRight).toBe('excluded') // named -> personalized
        expect(res.data.price.total).toBe(15800) // qty2 -> 7900 each
      })

      it('cart merge: a second add joins the open cart and reprices the whole ladder', async () => {
        const mkDesign = (body: string, qty: number) => ({
          productSchemaId: 'ps_it', schemaVersion: 1,
          characterSelections: { body }, faceLayer: null,
          textValues: [{ fieldId: 'name', value: 'M' }], selectedOptions: {},
          quantity: qty, photoStatus: 'deferred',
        })
        const d1 = await api.post('/store/gl/designs', { productId: handle, design: mkDesign('blue', 2) }, { headers })
        const cart1 = await api.post(
          '/store/gl/carts',
          { productId: handle, designIds: [d1.data.designId] },
          { headers },
        )
        expect(cart1.data.ladderUnitGrosz).toBe(7900) // 2 szt -> base tier

        const d2 = await api.post('/store/gl/designs', { productId: handle, design: mkDesign('pink', 1) }, { headers })
        const cart2 = await api.post(
          '/store/gl/carts',
          { productId: handle, designIds: [d2.data.designId], cartId: cart1.data.cartId },
          { headers },
        )
        // merged: 2+1 = 3 szt -> mid tier for EVERY line, in a fresh cart
        expect(cart2.data.totalQuantity).toBe(3)
        expect(cart2.data.ladderUnitGrosz).toBe(6500)
        expect(cart2.data.cartId).not.toBe(cart1.data.cartId)
        expect(cart2.data.lines).toHaveLength(2)
      })

      it('withdrawal semantics for a face product (T060 contract side)', async () => {
        // For THIS product every orderable design is personalized: a face (excluded), a
        // name (excluded) or a deferred photo (excluded — made-to-order commitment).
        // The contradictory "ready but no face" state is rejected by the engine, so a
        // non-personalized line cannot be manufactured here. The applies-branch of the
        // per-line computation is pinned by unit tests (withdrawal.unit.spec).
        const res = await api
          .post(
            '/store/gl/designs',
            {
              productId: handle,
              design: {
                productSchemaId: 'ps_it', schemaVersion: 1,
                characterSelections: { body: 'blue' },
                faceLayer: null, textValues: [], selectedOptions: {},
                quantity: 1, photoStatus: 'ready',
              },
            },
            { headers },
          )
          .catch((e: { response: { status: number } }) => e.response)
        expect(res.status).toBe(422)
      })

      it('POST designs rejects an unknown variant -> 422', async () => {
        const res = await api
          .post(
            '/store/gl/designs',
            {
              productId: handle,
              design: {
                productSchemaId: 'ps_it', schemaVersion: 1,
                characterSelections: { body: 'NETU' },
                faceLayer: null, textValues: [], selectedOptions: {},
                quantity: 1, photoStatus: 'deferred',
              },
            },
            { headers },
          )
          .catch((e: { response: { status: number } }) => e.response)
        expect(res.status).toBe(422)
      })

      it('free-default invariant: publishing a paid default is rejected (T031)', async () => {
        const container = getContainer()
        const schemas: ProductCustomizationModuleService = container.resolve(PRODUCT_CUSTOMIZATION_MODULE)
        const paid = JSON.parse(JSON.stringify(schemaDoc))
        paid.characterLayers[0].variants[0].priceDelta = 500
        await expect(schemas.publishSchema('prod_it_paid', paid)).rejects.toThrow()
      })

      it('reviews: submit lands pending, moderation publishes into the list (T066)', async () => {
        const submit = await api.post(
          '/store/gl/reviews',
          { productId: handle, rating: 5, body: 'Świetna figurka, dziecko zachwycone!', authorName: 'Ola' },
          { headers },
        )
        expect(submit.status).toBe(201)
        expect(submit.data.status).toBe('pending')
        expect(submit.data.verifiedBuyer).toBe(false) // no order claimed

        // pending is invisible on the storefront
        const before = await api.get(`/store/gl/reviews?productId=${handle}`, { headers })
        expect(before.data.summary.count).toBe(0)

        // moderate -> published -> visible with a correct summary
        const container = getContainer()
        const reviews: ReviewModuleService = container.resolve(REVIEW_MODULE)
        await reviews.moderate(submit.data.reviewId, 'published')

        const after = await api.get(`/store/gl/reviews?productId=${handle}`, { headers })
        expect(after.data.summary).toMatchObject({ count: 1, average: 5 })
        expect(after.data.reviews[0]).toMatchObject({ author: 'Ola', rating: 5, verifiedBuyer: false })
      })

      it('reviews: an out-of-range rating is rejected -> 422', async () => {
        const res = await api
          .post(
            '/store/gl/reviews',
            { productId: handle, rating: 7, body: 'zbyt entuzjastycznie', authorName: 'Bot' },
            { headers },
          )
          .catch((e: { response: { status: number } }) => e.response)
        expect(res.status).toBe(422)
      })

      it('re-publishing bumps the version and archives the previous one (T057 semantics)', async () => {
        const container = getContainer()
        const schemas: ProductCustomizationModuleService = container.resolve(PRODUCT_CUSTOMIZATION_MODULE)
        const products = container.resolve(Modules.PRODUCT)
        const [product] = await products.listProducts({ handle })

        const v2 = await schemas.publishSchema(product.id, { ...schemaDoc, medusaProductId: product.id })
        expect(v2.version).toBe(2)
        expect(v2.status).toBe('published')

        const active = await schemas.getActiveSchema(product.id)
        expect(active?.version).toBe(2)
        // the stored document itself carries the bumped version (order reproducibility)
        expect((active?.definition as { version: number }).version).toBe(2)

        const all = await schemas.listProductSchemas({ product_id: product.id })
        expect(all.map((s) => `${s.version}:${s.status}`).sort()).toEqual(['1:archived', '2:published'])
      })
    })
  },
})

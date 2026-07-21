import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { PRODUCT_CUSTOMIZATION_MODULE } from '../../src/modules/product_customization'
import type ProductCustomizationModuleService from '../../src/modules/product_customization/service'

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

        // a product the schema hangs off (resolved by id or handle)
        const products = container.resolve(Modules.PRODUCT)
        const [product] = await products.createProducts([
          { title: 'Figurka IT', handle: 'figurka-it', status: 'published' },
        ])
        handle = product.handle as string

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

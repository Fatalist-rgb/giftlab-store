import { assertFreeDefault, defaultSelectionPriceDelta } from '../validate'

describe('product_customization — free-default legal invariant', () => {
  const freeSchema = {
    characterLayers: [{ id: 'body', variants: [{ id: 'blue', priceDelta: 0 }, { id: 'pink', priceDelta: 0 }] }],
    options: [
      { id: 'base', default: 'std', values: [{ id: 'std', priceDelta: 0 }, { id: 'premium', priceDelta: 1000 }] },
    ],
  }

  it('accepts a schema whose default selection is free', () => {
    expect(defaultSelectionPriceDelta(freeSchema)).toBe(0)
    expect(() => assertFreeDefault(freeSchema)).not.toThrow()
  })

  it('rejects a paid default character variant', () => {
    const paid = {
      characterLayers: [{ id: 'body', variants: [{ id: 'blue', priceDelta: 500 }] }],
      options: [],
    }
    expect(defaultSelectionPriceDelta(paid)).toBe(500)
    expect(() => assertFreeDefault(paid)).toThrow(/free/i)
  })

  it('rejects a paid default option value', () => {
    const paid = {
      characterLayers: [{ id: 'body', variants: [{ id: 'blue', priceDelta: 0 }] }],
      options: [{ id: 'x', default: 'p', values: [{ id: 'p', priceDelta: 300 }, { id: 'f', priceDelta: 0 }] }],
    }
    expect(defaultSelectionPriceDelta(paid)).toBe(300)
    expect(() => assertFreeDefault(paid)).toThrow()
  })

  it('treats the first option value as the default when no default id is set', () => {
    const s = {
      characterLayers: [{ id: 'body', variants: [{ id: 'b', priceDelta: 0 }] }],
      options: [{ id: 'x', values: [{ id: 'f', priceDelta: 0 }, { id: 'p', priceDelta: 900 }] }],
    }
    expect(defaultSelectionPriceDelta(s)).toBe(0)
    expect(() => assertFreeDefault(s)).not.toThrow()
  })

  it('rejects a non-object schema', () => {
    expect(() => assertFreeDefault(null)).toThrow()
    expect(() => assertFreeDefault(42)).toThrow()
  })

  it('requires at least one character layer', () => {
    expect(() => assertFreeDefault({ characterLayers: [], options: [] })).toThrow(/character layer/i)
  })
})

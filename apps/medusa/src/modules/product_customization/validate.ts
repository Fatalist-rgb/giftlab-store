/**
 * Boundary re-check of the free-default legal invariant (Polish consumer law /
 * Constitution VIII): the DEFAULT selection of a published schema must cost zero
 * extra. The authoritative validation is @gl/constructor.parseProductSchema on
 * the storefront / publish edge; this mirrors its `defaultSelectionPriceDelta`
 * algorithm to guard the Medusa storage boundary (defense in depth for a legal rule).
 */

type Variant = { priceDelta?: number }
type Layer = { variants?: Variant[] }
type OptionValue = { id: string; priceDelta?: number }
type Option = { default?: string; values?: OptionValue[] }
type SchemaShape = { characterLayers?: Layer[]; options?: Option[] }

/** Price delta (in grosz) of the default selection: first variant of every layer + each option default. */
export function defaultSelectionPriceDelta(schema: SchemaShape): number {
  let total = 0
  for (const layer of schema.characterLayers ?? []) {
    const def = layer.variants?.[0]
    if (def) total += def.priceDelta ?? 0
  }
  for (const opt of schema.options ?? []) {
    const values = opt.values ?? []
    const chosen = values.find((v) => v.id === opt.default) ?? values[0]
    if (chosen) total += chosen.priceDelta ?? 0
  }
  return total
}

/** Throw unless `schema` is a plausibly-shaped ProductSchema with a free default. */
export function assertFreeDefault(schema: unknown): void {
  if (!schema || typeof schema !== 'object') {
    throw new Error('product schema must be a JSON object')
  }
  const s = schema as SchemaShape
  if (!Array.isArray(s.characterLayers) || s.characterLayers.length === 0) {
    throw new Error('product schema must declare at least one character layer')
  }
  const delta = defaultSelectionPriceDelta(s)
  if (delta !== 0) {
    throw new Error(
      `default selection must be free, but its price delta is ${delta} grosz. ` +
        'A paid default is not allowed (free-default invariant, art. Polish consumer law).',
    )
  }
}

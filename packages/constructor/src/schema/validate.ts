import { FreeDefaultViolation } from '../errors.js';
import { productSchemaZ, type ProductSchema } from './types.js';

/**
 * The default selection is the first variant of every character layer plus each
 * option's declared default (or its first value). Its total price delta MUST be zero.
 */
export function defaultSelectionPriceDelta(schema: ProductSchema): number {
  let total = 0;
  for (const layer of schema.characterLayers) {
    const def = layer.variants[0];
    if (def) total += def.priceDelta;
  }
  for (const opt of schema.options) {
    const defId = opt.default ?? opt.values[0]?.id;
    const val = opt.values.find((v) => v.id === defId) ?? opt.values[0];
    if (val) total += val.priceDelta;
  }
  return total;
}

/**
 * Parse untrusted JSON into a ProductSchema and enforce the free-default invariant
 * (FR-011 / Constitution VIII). Throws `ZodError` on shape errors and
 * `FreeDefaultViolation` when the default selection would cost more than the base.
 */
export function parseProductSchema(input: unknown): ProductSchema {
  const schema = productSchemaZ.parse(input);
  const delta = defaultSelectionPriceDelta(schema);
  if (delta !== 0) {
    throw new FreeDefaultViolation(delta);
  }
  return schema;
}

/** Non-throwing variant: returns the schema or a list of human-readable problems. */
export function safeParseProductSchema(
  input: unknown,
): { ok: true; schema: ProductSchema } | { ok: false; errors: string[] } {
  const parsed = productSchemaZ.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }
  const delta = defaultSelectionPriceDelta(parsed.data);
  if (delta !== 0) {
    return { ok: false, errors: [`default selection has a non-zero price delta (${delta})`] };
  }
  return { ok: true, schema: parsed.data };
}

import { parseProductSchema, FreeDefaultViolation, type ProductSchema } from '../../lib/gl-constructor'

/**
 * Validate a publishable ProductSchema with the shared @gl/constructor engine — the
 * SAME code the storefront preview and the render worker use. This runs the full zod
 * contract AND the free-default legal invariant (a paid default is legally refundable,
 * so it is rejected at publication). Throws `ZodError` on shape problems and
 * `FreeDefaultViolation` when the default selection is not free.
 */
export function validatePublishableSchema(definition: unknown): ProductSchema {
  return parseProductSchema(definition)
}

export { FreeDefaultViolation }

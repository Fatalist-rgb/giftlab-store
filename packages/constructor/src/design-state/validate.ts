import { DesignStateInvalid } from '../errors.js';
import type { ProductSchema } from '../schema/types.js';
import { designStateZ, type DesignState } from './types.js';

/**
 * Parse untrusted JSON into a DesignState and cross-check it against the schema
 * version it claims to target: every referenced layer/variant/option/text field must
 * exist, text must fit `maxLen`, and a non-deferred state must carry a face.
 * Throws `ZodError` on shape errors, `DesignStateInvalid` on a broken reference.
 */
export function parseDesignState(input: unknown, schema: ProductSchema): DesignState {
  const design = designStateZ.parse(input);
  const problems = crossCheck(design, schema);
  if (problems.length > 0) {
    throw new DesignStateInvalid(problems.join('; '));
  }
  return design;
}

export function crossCheck(design: DesignState, schema: ProductSchema): string[] {
  const problems: string[] = [];

  if (design.schemaVersion !== schema.version) {
    problems.push(`schemaVersion ${design.schemaVersion} != schema.version ${schema.version}`);
  }

  for (const [layerId, variantId] of Object.entries(design.characterSelections)) {
    const layer = schema.characterLayers.find((l) => l.id === layerId);
    if (!layer) {
      problems.push(`unknown character layer "${layerId}"`);
      continue;
    }
    if (!layer.variants.some((v) => v.id === variantId)) {
      problems.push(`layer "${layerId}" has no variant "${variantId}"`);
    }
  }

  for (const [optionId, valueId] of Object.entries(design.selectedOptions)) {
    const option = schema.options.find((o) => o.id === optionId);
    if (!option) {
      problems.push(`unknown option "${optionId}"`);
      continue;
    }
    if (!option.values.some((v) => v.id === valueId)) {
      problems.push(`option "${optionId}" has no value "${valueId}"`);
    }
  }

  for (const tv of design.textValues) {
    const field = schema.textFields.find((f) => f.id === tv.fieldId);
    if (!field) {
      problems.push(`unknown text field "${tv.fieldId}"`);
      continue;
    }
    if (tv.value.length > field.maxLen) {
      problems.push(`text "${tv.fieldId}" exceeds maxLen ${field.maxLen}`);
    }
  }

  // A deferred/failed/processing photo may have a null faceLayer; a "ready" one may not.
  if (design.photoStatus === 'ready' && design.faceLayer === null) {
    problems.push('photoStatus "ready" but faceLayer is null');
  }

  return problems;
}

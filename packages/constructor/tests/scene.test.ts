import { describe, expect, it } from 'vitest';
import { assessPhoto } from '../src/quality/index.js';
import { buildScene } from '../src/render/scene.js';
import { parseProductSchema } from '../src/schema/validate.js';
import { makeDesign, rawSchema } from './fixtures.js';

const schema = parseProductSchema(rawSchema);

describe('buildScene — deterministic (Constitution II)', () => {
  it('is a pure function of (schema, design)', () => {
    const a = buildScene(schema, makeDesign());
    const b = buildScene(schema, makeDesign());
    expect(a).toEqual(b);
  });

  it('paints in ascending zIndex: body → face → name', () => {
    const scene = buildScene(schema, makeDesign({ textValues: [{ fieldId: 'name', value: 'Kuba' }] }));
    expect(scene.nodes.map((n) => n.kind)).toEqual(['image', 'face', 'text']);
  });

  it('draws a placeholder face while the photo is deferred', () => {
    const scene = buildScene(schema, makeDesign({ faceLayer: null, photoStatus: 'deferred' }));
    const face = scene.nodes.find((n) => n.kind === 'face');
    expect(face).toMatchObject({ kind: 'face', placeholder: true, photoId: null });
  });

  it('drops empty text values', () => {
    const scene = buildScene(schema, makeDesign({ textValues: [{ fieldId: 'name', value: '  ' }] }));
    expect(scene.nodes.some((n) => n.kind === 'text')).toBe(false);
  });

  it('falls back to the first variant for an unselected layer', () => {
    const scene = buildScene(schema, makeDesign({ characterSelections: {} }));
    const image = scene.nodes.find((n) => n.kind === 'image');
    expect(image).toMatchObject({ assetKey: 'art/robert.png' });
  });
});

describe('assessPhoto — warns, never blocks (FR-004)', () => {
  it('warns below the minimum print resolution', () => {
    expect(assessPhoto({ width: 400, height: 400 }, schema)).toEqual({ ok: false, warning: 'resolution_low' });
  });

  it('passes a big enough photo', () => {
    expect(assessPhoto({ width: 1200, height: 1600 }, schema)).toEqual({ ok: true });
  });
});

# Contract: Product Schema + Design State (`packages/constructor`)

The single source of truth for what a product allows and what a customer configured. Exposed as
typed + zod-validated structures. Both the browser preview and the server renderer import these
types and the `buildScene` / `computePrice` functions — this is the fidelity + pricing seam.

## Exposed surface (package public API)

```text
packages/constructor
  types:        ProductSchema, DesignState, Scene
  validate:     parseProductSchema(json) -> ProductSchema        // throws on invalid
                parseDesignState(json, schema) -> DesignState     // cross-checks refs + bounds
  scene:        buildScene(schema, designState, assets) -> Scene  // pure, deterministic
  render:       renderToCanvas(scene, canvas)                     // browser + server adapters
  pricing:      computePrice(schema, designState) -> PriceBreakdown  // deterministic, minor units
  contour:      buildCutContour(schema, scene) -> CutPath         // vector cut geometry
```

## ProductSchema (shape)

```jsonc
{
  "id": "uuid", "medusaProductId": "prod_...", "version": 3, "status": "published",
  "photoZones": [{ "id": "main", "bounds": { "x":0,"y":0,"w":1000,"h":1400 },
                   "minResolutionPx": { "w": 1200, "h": 1680 },
                   "transforms": ["move","scale","rotate"] }],
  "textFields": [{ "id": "name", "label": {"pl":"Imię","en":"Name","uk":"Ім'я"},
                   "maxLen": 20, "fonts": ["Fraunces"], "colors": ["#211E1A","#C0714E"] }],
  "options":   [{ "id":"size", "type":"size", "values":["S","M","L"], "default":"M" }],
  "accessories":[{ "id":"box", "priceDelta": 2000, "incompatibleWith": [] }],
  "constraints": { "rules": [] },
  "pricingRules": { "base": { "S":5900,"M":7900,"L":9900 }, "currency":"PLN" },
  "cutContour": { "source":"zone:main", "offsetMm": 3, "spotName":"CutContour" }
}
```

## DesignState (shape)

```jsonc
{
  "productSchemaId":"uuid", "schemaVersion":3,
  "photoLayers":[{ "uploadedPhotoId":"uuid","zoneId":"main","x":40,"y":20,"scale":1.1,"rotation":-3 }],
  "textValues":[{ "fieldId":"name","value":"Ola","font":"Fraunces","color":"#211E1A" }],
  "selectedOptions": { "size":"M" }, "selectedAccessories":["box"], "quantity":1
}
```

## Guarantees

- `buildScene` is **pure and deterministic**: same (schema, designState, assets) → same Scene in
  browser and Node. No `Date.now`/random in the scene path.
- `computePrice` returns minor units and is the **only** pricing authority; the storefront shows
  its output but the server recomputes it (see storefront-api.md).
- `parseDesignState` rejects any ref/transform that violates the referenced schema version
  (satisfies FR-002/FR-008 and the reproducibility rule).

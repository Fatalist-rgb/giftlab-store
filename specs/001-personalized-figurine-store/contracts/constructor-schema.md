# Contract: Product Schema + Design State (`packages/constructor`)

**Revised**: 2026-07-16 (rev 2 — character layers, quantity ladder, free-default invariant, legal)

The single source of truth for what a product allows and what a customer configured. Exposed as
typed + zod-validated structures. Both the browser preview and the server renderer import these
types and the `buildScene` / `computePrice` functions — this is the fidelity, pricing, and legal seam.

## Exposed surface (package public API)

```text
packages/constructor
  types:        ProductSchema, DesignState, Scene, PriceBreakdown, WithdrawalVerdict
  validate:     parseProductSchema(json) -> ProductSchema     // throws; enforces free-default invariant
                parseDesignState(json, schema) -> DesignState  // cross-checks refs + bounds
  scene:        buildScene(schema, designState, assets) -> Scene   // pure, deterministic
  render:       renderToCanvas(scene, canvas)                      // browser + server adapters
  pricing:      computePrice(schema, designState[], qty) -> PriceBreakdown  // incl. quantity ladder
  contour:      buildCutContour(schema, scene) -> CutPath
  legal:        computeWithdrawalRight(designState) -> WithdrawalVerdict   // pure, per line
  quality:      assessPhoto(photo, schema, size) -> { ok, warning? }       // warns, never blocks
```

## ProductSchema (shape)

```jsonc
{
  "id": "uuid", "medusaProductId": "prod_...", "version": 4, "status": "published",

  // Body is CATALOGUE ARTWORK the customer selects — never derived from their photo.
  // This is what makes the live preview trustworthy.
  "characterLayers": [
    { "id": "body", "zIndex": 10, "label": {"pl":"Sylwetka","en":"Body","uk":"Статура"},
      "variants": [ { "id":"dad",  "label":{"pl":"Tata"},  "assetKey":"art/body-dad.svg",  "priceDelta":0 },
                    { "id":"mom",  "label":{"pl":"Mama"},  "assetKey":"art/body-mom.svg",  "priceDelta":0 } ] },
    { "id": "skin", "zIndex": 11, "variants": [ { "id":"s1","assetKey":"art/skin-1.svg","priceDelta":0 } ] },
    { "id": "outfit", "zIndex": 20, "variants": [ { "id":"tee","assetKey":"art/outfit-tee.svg","priceDelta":0 } ] }
  ],

  // Only the FACE comes from the customer.
  "faceZone": { "bounds": {"x":320,"y":140,"w":360,"h":360},
                "maskAssetKey": "art/face-mask.svg",
                "minResolutionPx": { "w": 900, "h": 900 },   // drives a WARNING, not a block
                "transforms": ["move","scale","rotate"] },

  "textFields": [{ "id":"name", "label":{"pl":"Imię","en":"Name","uk":"Ім'я"},
                   "maxLen":20, "fonts":["Bricolage Grotesque"], "colors":["#17131A","#FF6A2B"],
                   "placement":"base" }],

  "options":   [{ "id":"size", "type":"size",
                  "values":[{"id":"S","priceDelta":0,"dimensionsMm":{"h":80}},
                            {"id":"M","priceDelta":2000,"dimensionsMm":{"h":110}},
                            {"id":"L","priceDelta":4000,"dimensionsMm":{"h":140}}],
                  "default":"S" }],                          // default MUST be a zero-delta value
  "accessories":[{ "id":"box", "priceDelta":2000, "incompatibleWith":[] }],
  "constraints": { "rules": [] },

  "pricingRules": { "base": 5900, "currency":"PLN",
                    "quantityLadder": [ {"minQty":1,"unitPrice":5900}, {"minQty":3,"unitPrice":4900},
                                        {"minQty":6,"unitPrice":3900} ] },

  "cutContour": { "source":"composite", "offsetMm": 3, "spotName":"CutContour" }
}
```

## DesignState (shape)

```jsonc
{
  "productSchemaId":"uuid", "schemaVersion":4,
  "characterSelections": { "body":"dad", "skin":"s1", "outfit":"tee" },
  "faceLayer": { "uploadedPhotoId":"uuid", "x":18, "y":-6, "scale":1.08, "rotation":-2 },  // null if deferred
  "textValues":[{ "fieldId":"name", "value":"Kuba", "font":"Bricolage Grotesque", "color":"#17131A" }],
  "selectedOptions": { "size":"M" }, "selectedAccessories":["box"], "quantity":1,
  "photoStatus": "ready"          // ready | deferred | processing | failed
}
```

## Invariants (enforced in code, not by convention)

- **`buildScene` is pure and deterministic**: same (schema, designState, assets) → same Scene in
  browser and Node. No `Date.now`/random in the scene path. Because the body is catalogue artwork
  and the face is a background-free cutout, the scene is fully determined — this is the mechanism
  behind Principle II.
- **Free-default invariant (FR-011).** `parseProductSchema` MUST reject a schema whose default
  selection carries a non-zero total `priceDelta`. Re-checked at add-to-cart. *A pre-selected paid
  option is refundable on demand under Polish law — so this is a hard schema rule, not a guideline.*
- **`computePrice` is the only pricing authority** and returns minor units. The storefront displays
  its output; the server recomputes it (see storefront-api.md).
- **`computeWithdrawalRight(designState)`** returns `excluded` only when the line carries real
  personalization (a face photo and/or non-empty custom text); otherwise `applies`. Pure and
  unit-tested — the legal position of every order line is reproducible from data.
- **`assessPhoto` warns, never blocks** (FR-004). A resolution shortfall returns a warning that the
  UI must surface with a remedy; it must not gate checkout.
- **`parseDesignState`** rejects any ref/transform violating the referenced schema version.
- **Deferred photo** (`photoStatus: "deferred"`, `faceLayer: null`) is a valid, orderable state
  (FR-013). `buildScene` renders the character with a face placeholder; production is withheld
  until the photo arrives.

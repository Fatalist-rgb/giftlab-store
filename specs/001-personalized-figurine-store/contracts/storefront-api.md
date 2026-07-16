# Contract: Storefront HTTP API (custom endpoints)

**Revised**: 2026-07-16 (rev 2 — cutout, deferred photo, per-line legal notice, reviews)

Only endpoints Medusa does not already provide. Public endpoints are unauthenticated (store
context); admin endpoints require staff auth. All bodies JSON unless noted.

## Public — `/store/gl/*`

### GET `/store/gl/products/:handle/schema`
Returns the published `ProductSchema` (current version): character layers + variants (with artwork
URLs), face zone, options, accessories, pricing rules incl. quantity ladder.
→ `200 { schema: ProductSchema }` · `404` if none published.

### POST `/store/gl/uploads/sign`
Request a presigned R2 PUT for a customer **face** photo.
Body: `{ mime, sizeBytes, consent: true }` — consent MUST be true (FR-032).
→ `200 { uploadUrl, photoId, expiresIn }` · `400` if consent false / unsupported type.

### POST `/store/gl/uploads/:photoId/finalize`
Server normalizes the uploaded master: HEIC→raster, apply EXIF orientation, strip metadata.
→ `200 { photoId, width, height, previewUrl, quality: { ok: bool, warning?: "resolution_low" } }`
**Never returns a blocking error for low resolution** — it reports `quality.warning` and the UI
surfaces a remedy (FR-004).

### POST `/store/gl/uploads/:photoId/cutout`
Kicks off background removal (FR-003).
→ `202 { status: "processing" }`, then poll:

### GET `/store/gl/uploads/:photoId/cutout`
→ `200 { status: "processing" | "ready" | "failed", cutoutUrl?, message? }`
The UI shows honest progress while `processing`. On `failed` the shopper may retry, swap the photo,
or continue with the photo **deferred** (FR-013) — never a dead end.

### POST `/store/gl/price`
Authoritative price for one or more designs (never trust client math).
Body: `{ designStates: DesignState[] }` → `200 { price: PriceBreakdown }` (applies the quantity
ladder across personalized lines) · `422` if any design is invalid.

### POST `/store/gl/cart/:cartId/line-items`
Add one or more configured items (FR-012 — several different designs in one order): validates each
`designState`, **re-checks the free-default invariant**, recomputes price, persists DesignStates,
attaches them to Medusa line items.
→ `200 { lineItemIds: string[] }` · `422` on invalid design or a paid default.

### GET `/store/gl/delivery-estimate?locale&method`
→ `200 { from: "2026-08-12", to: "2026-08-18" }` — a **date window with production already
included** (FR-018). The storefront never renders a "5–7 working days" lead time, and the returned
window is stored on the order as the promise made.

### GET `/store/gl/legal/withdrawal-notice?locale`
→ `200 { version: "wn-2026-07-01", body: "..." }` — the exact notice text and its version, so the
checkout can display it and the order can record which version the buyer saw (FR-030).

### GET `/store/gl/orders/:orderId/lines/:lineId/render-status`
→ `200 { status: "queued|processing|ready|failed|awaiting_photo" }`

### POST `/store/gl/orders/:orderId/lines/:lineId/photo`
Attach a deferred face photo after purchase (FR-013); triggers cutout + render.
→ `200 { status: "processing" }`

### GET `/store/gl/products/:handle/reviews`
→ `200 { items: [{ rating, body, photoUrl?, verifiedBuyer: bool, publishedAt }], summary: { average, count, distribution } }`
The storefront MUST also state whether and how reviews are verified (FR-038).

> Checkout, payment session creation (card/BLIK/Przelewy24), and order placement use the **native
> Medusa Store API**. On placement a subscriber freezes each DesignState, computes the
> withdrawal right per line, records the notice version, stores the promised delivery window, and
> enqueues renders.

## Admin — `/admin/gl/*` (staff auth)

### GET `/admin/gl/orders/:orderId/lines/:lineId/package`
→ `200 { printPngUrl, printPdfUrl, cutSvgUrl, specJsonUrl, previewUrl }` (short-lived signed R2
GET URLs) · `409` if not `ready` (FR-025).

### GET `/admin/gl/orders/flagged`
→ `200 { items: [{ orderId, lineId, reason: "render_failed" | "awaiting_photo" }] }` (FR-028).

### PATCH `/admin/gl/products/:productId/schema`
Publish a new `ProductSchema` version. Rejects with `422` if the default selection is not free.
→ `200 { version }` (FR-026). Existing orders keep their snapshot.

### GET `/admin/gl/orders/export?format=csv|xlsx&from&to`
→ `200` file stream: order + fulfilment + design summary + withdrawal flag per line (FR-027).

## Error model

`{ error: { code, message, details? } }`; 4xx = client/validation, 5xx = server. Validation errors
quote the offending field. **No personal data** (photos, emails) in error payloads or logs.

## Traffic hygiene

Ad-platform link preloaders (e.g. TikTok's, identified by user agent) MUST NOT be counted as
visits and MUST NOT trigger uploads or tracking (FR-044/FR-045). Ad entry pages expose no upload
endpoint.

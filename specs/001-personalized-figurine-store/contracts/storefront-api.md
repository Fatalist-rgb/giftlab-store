# Contract: Storefront HTTP API (custom endpoints)

Only endpoints Medusa does not already provide. Public endpoints are unauthenticated (store
context); admin endpoints require staff auth. All bodies JSON unless noted.

## Public — `/store/gl/*`

### GET `/store/gl/products/:handle/schema`
Returns the published `ProductSchema` (current version) for a product.
→ `200 { schema: ProductSchema }` · `404` if none published.

### POST `/store/gl/uploads/sign`
Request a presigned R2 PUT for a customer photo.
Body: `{ mime, sizeBytes, consent: true }` (consent MUST be true, FR-022).
→ `200 { uploadUrl, photoId, expiresIn }` · `400` if consent false / type unsupported.
After the client PUTs the file, the server normalizes it (HEIC→raster, EXIF, resolution gate)
on a follow-up `POST /store/gl/uploads/:photoId/finalize` → `200 { photoId, width, height,
previewUrl }` · `422 { reason: "resolution_too_low" }` (FR-001/FR-002).

### POST `/store/gl/price`
Authoritative price for a design (never trust client math).
Body: `{ designState }` → `200 { price: PriceBreakdown }` · `422` if design invalid.

### POST `/store/gl/cart/:cartId/line-items`
Add a configured item: validates `designState`, recomputes price, stores DesignState, attaches
its id to a Medusa line item. → `200 { lineItemId }` · `422` on invalid design.

### GET `/store/gl/orders/:orderId/render-status`
→ `200 { status: "queued|processing|ready|failed" }` (FR-012 progress).

> Checkout, payment session creation (card/BLIK/Przelewy24), and order placement use **native
> Medusa Store API**; on order placement a subscriber freezes the DesignState + enqueues render.

## Admin — `/admin/gl/*` (staff auth)

### GET `/admin/gl/orders/:orderId/package`
→ `200 { printPngUrl, printPdfUrl, cutSvgUrl, specJsonUrl, previewUrl }` (short-lived signed R2
GET URLs) · `409` if render not `ready` (FR-016).

### PATCH `/admin/gl/products/:productId/schema`
Publish a new `ProductSchema` version (prices, options, params). → `200 { version }` (FR-017).
Editing creates a new immutable version; existing orders keep their snapshot.

### GET `/admin/gl/orders/export?format=csv|xlsx&from&to`
→ `200` file stream with order + fulfillment + design summary columns (FR-018).

## Error model

`{ error: { code, message, details? } }`; 4xx = client/validation, 5xx = server. Validation
errors quote the offending field. No personal data (photos, emails) in error payloads or logs.

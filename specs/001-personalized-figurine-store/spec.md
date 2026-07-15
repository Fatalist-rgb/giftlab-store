# Feature Specification: Personalized Figurine Storefront (Stage 1 MVP)

**Feature Branch**: `001-personalized-figurine-store`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "Stage 1 MVP of GiftLab — an e-commerce storefront selling ONE personalized product (an acrylic 'belly' figurine) through a data-driven online constructor. Primary traffic is paid social (FB/IG/TikTok) on mobile."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Design and order a personalized figurine (Priority: P1)

A shopper arriving from a social ad on their phone opens the product page, launches the
constructor, uploads a personal photo, positions it, adds a name/short text, picks size and
accessories, watches the preview and price update live, and completes payment. The system
records exactly what they designed and confirms the order by email.

**Why this priority**: This is the core revenue path. Without it there is no product and no
sale. It is the smallest slice that delivers real business value on its own.

**Independent Test**: On a mobile device, a shopper can upload a photo, customize the figurine,
add it to the cart, pay, and receive an order confirmation; a resulting order captures the
complete design and the resolved price.

**Acceptance Scenarios**:

1. **Given** a shopper on the product page, **When** they upload a valid photo and adjust its
   position/scale/rotation, add text, and choose size/base/accessories/quantity, **Then** the
   live preview and the price update immediately to reflect every choice.
2. **Given** a photo below the minimum required resolution, **When** the shopper tries to add
   the item to the cart, **Then** the system explains the problem and blocks progression until
   a suitable photo is provided.
3. **Given** an iPhone HEIC photo that is rotated by its EXIF data, **When** it is uploaded,
   **Then** it is converted to a supported format and displayed in the correct orientation.
4. **Given** a completed design in the cart, **When** the shopper pays with card, BLIK, or
   Przelewy24, **Then** payment succeeds, an order is created that stores the exact design
   (photo transform, text, options) together with the product-schema version, and a
   confirmation email is sent.
5. **Given** a successfully paid order, **When** the production file is generated, **Then** a
   production package (print file at 300 DPI, a separate cut-contour layer, a parameter
   specification, and a preview image) exists for that order and matches what the shopper saw.
6. **Given** a payment that fails or is abandoned, **When** the shopper returns, **Then** their
   design is preserved in the cart and no production file is generated.

---

### User Story 2 - Fulfill and manage orders (Priority: P2)

Staff open the admin, review incoming orders, download the production package needed to
manufacture each figurine, adjust prices and constructor parameters when needed, and export
orders for accounting or production planning.

**Why this priority**: Orders must be fulfillable, but the storefront can begin capturing paid
orders before the admin is fully polished; fulfillment can start with the data already stored.

**Independent Test**: Staff can open any order, see its full configuration, download its
production package, change the product's price or options, and export the order list to
CSV/Excel.

**Acceptance Scenarios**:

1. **Given** a paid order, **When** staff open it in the admin, **Then** they see the customer's
   configuration and can download the complete production package.
2. **Given** a change in cost, **When** staff edit the product price or an option's price,
   **Then** new orders reflect the updated pricing.
3. **Given** a set of orders, **When** staff export them, **Then** they receive a CSV/Excel file
   containing the order and fulfillment fields.

---

### User Story 3 - Reach, compliance, and trust (Priority: P3)

Visitors browse in their language (Polish, English, or Ukrainian), see a fast mobile
experience, are asked for cookie consent before any tracking runs, and can trust that their
uploaded photos are private and removable. The store is discoverable in search engines.

**Why this priority**: These layers maximize conversion of paid traffic and satisfy legal
obligations, but they build on top of the core purchasing flow rather than blocking it.

**Independent Test**: The site serves pl/en/uk with correct hreflang and a working language
switch; analytics fire only after consent; uploaded photos remain private and can be deleted on
request; storefront and product pages meet mobile performance targets.

**Acceptance Scenarios**:

1. **Given** a first-time visitor, **When** the page loads, **Then** no analytics or marketing
   tags run until the visitor accepts cookie consent.
2. **Given** the language switch, **When** a visitor selects English or Ukrainian, **Then** all
   user-facing text changes and the page exposes correct hreflang alternates.
3. **Given** a customer who requests deletion of their data, **When** the request is processed,
   **Then** their uploaded photo and personal data are removed within the stated period.
4. **Given** the product page on a mid-range phone, **When** it loads, **Then** the constructor
   loads lazily and the page meets mobile Core Web Vitals thresholds.

---

### Edge Cases

- A very large photo is uploaded → it is accepted and processed without freezing or crashing
  the shopper's device.
- A render job fails → it is retried automatically; if it still fails, the order is flagged and
  staff are alerted, without losing the stored design.
- A shopper edits a design after adding to cart → the cart and stored design update
  consistently, and price recalculates.
- An option combination is invalid per the product schema's constraints → the shopper is
  prevented from selecting it or warned before checkout.
- Consent is declined → the site remains fully functional for browsing and ordering, with no
  tracking.
- The uk locale is later removed → the site continues to work in pl/en with no residual broken
  links.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let a shopper upload a photo in JPEG, PNG, WebP, or HEIC, convert
  HEIC to a supported format, and normalize EXIF orientation.
- **FR-002**: The system MUST verify a minimum photo resolution suitable for print and block
  checkout with a clear message when the photo is insufficient.
- **FR-003**: The shopper MUST be able to position, scale, and rotate the uploaded photo within
  the product's photo zone.
- **FR-004**: The shopper MUST be able to add custom text (e.g., a name) to the figurine.
- **FR-005**: The shopper MUST be able to select the product's options (size, base, accessories,
  quantity) as defined by that product's schema.
- **FR-006**: The system MUST show a real-time preview that reflects the photo, text, and every
  selected option.
- **FR-007**: The system MUST show a live price that updates with options and quantity.
- **FR-008**: A product MUST be defined by a versioned Product Schema describing photo zones,
  text fields, options/colors/accessories, constraints, pricing rules, and the cut-contour
  layer; no product-specific behavior is hardcoded outside the schema.
- **FR-009**: The shopper MUST be able to add the configured item to a cart that persists across
  the session.
- **FR-010**: The system MUST support checkout with card, BLIK, and Przelewy24.
- **FR-011**: On successful payment, the system MUST persist the complete Design State (photo
  transform, text, fonts, colors, chosen options) together with a snapshot of the Product Schema
  version, attached to the order.
- **FR-012**: The system MUST automatically generate, without manual preparation, a production
  package containing a 300 DPI print file (PNG/PDF/SVG), a separate CutContour cut-line layer, a
  JSON parameter specification, and a preview image.
- **FR-013**: The generated production file MUST correspond to what the shopper saw in the
  preview (same design, same layout).
- **FR-014**: The system MUST store uploaded photos and production files privately, using
  time-limited signed access and encryption at rest.
- **FR-015**: The system MUST send an order-confirmation email to the customer.
- **FR-016**: Staff MUST be able to view an order's full configuration and download its
  production package.
- **FR-017**: Staff MUST be able to edit product prices and constructor parameters.
- **FR-018**: Staff MUST be able to export orders to CSV/Excel.
- **FR-019**: The system MUST serve Polish (default), English, and Ukrainian, with a language
  switch and correct hreflang; adding or removing a locale MUST NOT require reworking features.
- **FR-020**: Analytics and marketing tags (GA4, GTM, Meta Pixel) MUST NOT load before the
  visitor grants cookie consent.
- **FR-021**: The system MUST provide base SEO: unique title/description per page, sitemap.xml,
  robots.txt, canonical URLs, and hreflang alternates.
- **FR-022**: The system MUST capture explicit consent for photo processing before an order is
  placed.
- **FR-023**: The system MUST enforce a defined photo/personal-data retention period and support
  technical deletion of a customer's personal data on request.
- **FR-024**: The system MUST perform daily database backups with point-in-time recovery and
  version stored files.
- **FR-025**: The storefront and product page MUST be mobile-first and responsive, with the
  constructor loaded lazily so it does not block first paint.

### Key Entities *(include if feature involves data)*

- **Product Schema**: The versioned definition of a personalizable product — its photo zones,
  text fields, options/colors/accessories, constraints, pricing rules, and cut-contour. The
  single source of what a product allows.
- **Design State**: A customer's specific configuration — photo transform (position/scale/
  rotation), text, fonts, colors, and chosen options, plus a reference to the Product Schema
  version it was built against.
- **Order**: A purchase that references the customer's Design State and the resulting production
  package, along with standard commerce data (items, price, payment, contact).
- **Production Package**: The manufacturing output for an order — the print file, the CutContour
  layer, the JSON parameter specification, and the preview image.
- **Uploaded Photo**: A customer-provided image, held privately, associated with consent and a
  retention/deletion lifecycle.
- **Cart**: The in-progress selection of configured items before checkout.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A shopper can go from opening the product page to a paid order on a phone in under
  5 minutes.
- **SC-002**: For a sample of test orders, the generated production file matches the customer's
  preview 100% of the time and is print-ready at 300 DPI with a valid, closed cut contour.
- **SC-003**: Staff can retrieve everything needed to manufacture and fulfill any order in under
  1 minute from opening it.
- **SC-004**: Zero analytics or marketing network calls occur before a visitor grants consent.
- **SC-005**: A customer's photo and personal data are removed within the stated retention/
  deletion window after a valid request.
- **SC-006**: Storefront and product pages meet mobile Core Web Vitals "good" thresholds on a
  mid-range device.
- **SC-007**: The store is fully usable in Polish, English, and Ukrainian, with correct hreflang
  alternates on every public page.
- **SC-008**: Every paid order results in a stored Design State and a generated production
  package (no order left without its manufacturing data).

## Assumptions

- **Provisional product catalog (client to confirm):** one primary photo zone and one text
  field; sizes S/M/L; provisional prices S 59 / M 79 / L 99 zł; provisional accessories
  (keyring +10, magnet +12, name engraving +15, premium box +20 zł); currency PLN; market
  Poland. Because the constructor is data-driven, these exact values are configuration and can
  be finalized without code changes.
- **Minimum photo resolution** is derived from the largest offered print size at 300 DPI; photos
  below that threshold are blocked at the quality gate.
- **Photo/personal-data retention:** photos are retained for the order lifecycle plus a
  reprint/complaint window (assumed 90 days), then auto-deleted; on-request deletion is honored
  at any time (RODO).
- **Guest checkout** is the primary path; account creation is optional and not required to order.
- **The uk locale is temporary** and can be removed via configuration without affecting pl/en.
- **The payment merchant account and all hosting/service accounts** are owned by the client, so
  the finished platform and its access can be transferred in full.
- **Out of scope for Stage 1** (kept architecturally ready, built later): visual no-code
  template editor, promo codes / sales / gift certificates, and extended statistics (Stage 2);
  AI background removal / enhancement / generation, ERP/CRM, and delivery-service integration
  (Stage 3).

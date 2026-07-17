# Feature Specification: Personalized Figurine Storefront (Stage 1 MVP)

**Feature Branch**: `001-personalized-figurine-store`

**Created**: 2026-07-16 · **Revised**: 2026-07-17 (rev 3 — real product: single size, built-in magnet, quantity-only pricing)

**Status**: Draft

**Input**: A Polish-market storefront selling personalized acrylic figurines ("figurka z brzuszkiem")
configured by the customer through an online constructor. Traffic is paid social (FB/IG/TikTok),
mobile-first.

> **Revision note (rev 2).** Research into the reference product and 12 comparable stores changed
> three foundations: (1) the **product model** — the character body is pre-drawn and selectable;
> only the **face** comes from the customer's photo, with automatic background removal; (2) the
> **photo-quality gate** warns instead of blocking; (3) a set of **Polish legal constraints**
> (paid defaults, withdrawal-right disclosure, cookie basis, price transparency) that are
> requirements, not nice-to-haves. Sources: `research/findings-consolidated.md`.
>
> **Revision note (rev 3).** The reference product page and the finished demo confirmed the real
> catalogue: **one size** (11 cm / 4.3"), a **magnetic backing built into every unit**, and
> **every configuration option free** — so **quantity is the only price lever** (a flat base with
> a per-unit quantity ladder). The earlier S/M/L sizes, the stand/base, and the paid accessories
> (keyring, magnet, engraving, premium box) were provisional benchmarks and are removed. The
> "no paid default" invariant (FR-011) stays as a guardrail: it now holds trivially, and protects
> any future priced option.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Design & order a personalized figurine (Priority: P1)

A shopper arrives from a social ad on their phone, picks a character that resembles the person
the gift is for, uploads a photo of their face, watches the face drop onto the character with the
background removed automatically, adds a name, chooses how many to order, sees the price update as
they go, and pays with BLIK. The system stores exactly what they designed and produces the
manufacturing files automatically.

**Why this priority**: This is the entire revenue path and the product's reason to exist. Nothing
else matters if this does not work.

**Independent Test**: On a phone, a shopper can configure a figurine end-to-end, pay, and receive
confirmation; the order carries the complete design, and a production package matching the
customer's preview is generated.

**Acceptance Scenarios**:

1. **Given** the product page, **When** the shopper selects character options (body, skin tone,
   clothing) **Then** the preview updates immediately and always renders correctly, because the
   body is drawn from the catalogue rather than from the customer's photo.
2. **Given** a face photo (including an EXIF-rotated iPhone HEIC), **When** it is uploaded,
   **Then** it is converted, oriented correctly, its background is removed automatically with
   visible progress, and the resulting face appears in the character's face zone.
3. **Given** a photo below the recommended resolution, **When** the shopper continues, **Then**
   the system **warns clearly and offers a remedy but does not block** checkout.
4. **Given** background removal fails or the shopper is unhappy with the cutout, **When** they
   proceed, **Then** they can retry, upload a different photo, or **order anyway and send the
   photo later by email**, without losing the configuration.
5. **Given** a completed design, **When** the shopper adds a name and adjusts the quantity, **Then**
   the price updates live — driven by the quantity ladder, since every option is free — and **no
   paid option is pre-selected by default**.
6. **Given** the cart, **When** the shopper checks out as a guest with card, BLIK, or Przelewy24
   and selects an InPost parcel locker, **Then** the order is placed and confirmed by email.
7. **Given** a paid order, **When** production files are generated, **Then** a package exists
   containing a 300 DPI print file, a separate cut-contour layer, a parameter specification, and
   a preview — matching what the shopper approved.
8. **Given** the shopper wants several different figurines, **When** they increase quantity,
   **Then** they can configure **each one separately** in the same order and the per-unit price
   decreases according to the published quantity ladder.
9. **Given** a payment that fails or is abandoned, **When** the shopper returns, **Then** the
   configuration is preserved and no production files are generated.

---

### User Story 2 - Fulfil & manage orders (Priority: P2)

Staff review incoming orders, download everything needed to manufacture each figurine, adjust
prices and constructor options, and export orders for production planning and accounting.

**Why this priority**: Orders must be fulfillable, but the store can begin capturing paid orders
before the admin is polished — the data is already stored.

**Independent Test**: Staff can open any paid order, see its full configuration, download its
production package, change a price or option, and export orders to CSV/Excel.

**Acceptance Scenarios**:

1. **Given** a paid order, **When** staff open it, **Then** they see the customer's configuration
   and can download the complete production package.
2. **Given** an order whose face photo was deferred (see US1 scenario 4), **When** staff open it,
   **Then** the order is clearly flagged as awaiting the photo, and once the photo is attached the
   production package is generated.
3. **Given** a price or option change, **When** staff publish it, **Then** new orders use the new
   values while existing orders keep the configuration they were bought under.
4. **Given** a set of orders, **When** staff export them, **Then** they receive a CSV/Excel file
   with order, fulfilment, and design-summary columns.

---

### User Story 3 - Trust, reach & compliance (Priority: P3)

A first-time visitor from an ad sees the store in their language, is told honestly when the
figurine will arrive, understands what happens if it turns out wrong, is asked for cookie consent
before anything tracks them, and can trust their photo is private.

**Why this priority**: This layer earns the first order from an unknown brand and keeps the store
lawful, but it builds on top of the purchase flow.

**Independent Test**: The store serves pl/en/uk with correct hreflang; no tracking fires before
consent; delivery dates and the returns position are clear on the product page; photos are private
and deletable; mobile performance meets targets.

**Acceptance Scenarios**:

1. **Given** a first-time visitor, **When** the page loads, **Then** no analytics or marketing tags
   run until consent is granted, and refusing consent leaves the store fully usable.
2. **Given** the product page, **When** the shopper reads it, **Then** they see a **delivery date
   range** (production already included), customer reviews, and the guarantee — before they are
   asked to buy.
3. **Given** a personalized item in the cart, **When** the shopper reaches payment, **Then** they
   are told **clearly and in plain Polish, next to the pay button**, that a made-to-order item has
   no 14-day withdrawal right — presented together with the voluntary guarantee that replaces it.
4. **Given** an order containing only standard, non-personalized options, **When** it is placed,
   **Then** the standard 14-day withdrawal right **does apply** to that line and is not denied.
5. **Given** the language switch, **When** the visitor selects English or Ukrainian, **Then** all
   text changes and correct hreflang alternates are exposed.
6. **Given** a deletion request, **When** it is processed, **Then** the customer's photo and
   personal data are removed; otherwise photos are deleted automatically when retention expires.
7. **Given** the product page on a mid-range phone, **When** it loads, **Then** the constructor
   loads lazily and mobile performance targets are met.

---

### Edge Cases

- Background removal produces a poor cutout (hair, glasses, group photo) → shopper can retry,
  swap photo, adjust, or defer the photo; never a dead end.
- A group photo is uploaded where a single face is expected → the shopper is guided to choose or
  crop one face.
- A face photo is very large → processed without freezing the device.
- The AI service is unavailable → the shopper can still order, with the photo deferred; staff are
  alerted.
- A production render fails → retried automatically; on final failure the order is flagged for
  staff, and the design is never lost.
- An invalid option combination per the schema's constraints → prevented or explained before
  checkout.
- Traffic arrives from TikTok's link preloader → it must not be counted as a visit, and no upload
  or tracking is triggered by it.
- The uk locale is removed later → pl/en keep working, with no broken links.

## Requirements *(mandatory)*

### Functional Requirements — Constructor & product

- **FR-001**: The character body MUST be assembled from **catalogue artwork variants defined in the
  product schema** (e.g. body type, skin tone, hair, clothing, pose). The customer selects them; the
  system never derives the body from the customer's photo.
- **FR-002**: The customer MUST be able to upload a **face photo** in JPEG, PNG, WebP, or HEIC; the
  system MUST convert HEIC and normalise EXIF orientation.
- **FR-003**: The system MUST **remove the background from the uploaded face automatically** and
  place the result in the character's face zone, showing honest progress while it works.
- **FR-004**: The system MUST evaluate photo resolution against the print size and, when it is
  insufficient, **warn the customer and offer a remedy — it MUST NOT block checkout**.
- **FR-005**: The customer MUST be able to reposition, scale, and rotate the face within its zone.
- **FR-006**: The customer MUST be able to add custom text (a name) rendered on the figurine itself.
- **FR-007**: The customer MUST be able to select the product options declared by the product
  schema and choose the quantity. For this product every option is **free of charge** and the
  quantity is the **only price lever** (a single physical size with a magnetic backing built in).
- **FR-008**: The system MUST show a **real-time preview** that reflects every choice. The preview
  is trustworthy because the body is catalogue artwork and the face is a background-free cutout.
- **FR-009**: The system MUST show a **live price**. The only price lever is the **quantity ladder**,
  shown as the per-unit saving (e.g. "−14 zł/szt from 3 pcs") alongside the total. Should any option
  ever carry a surcharge, it MUST be shown as an itemised delta.
- **FR-010**: A product MUST be defined by a **versioned Product Schema** covering character
  variants, face zone, text fields, free options, the fixed physical spec (size, magnetic backing),
  constraints, quantity-based pricing, and the cut-contour. No product-specific behaviour outside
  the schema.
- **FR-011**: Default selections MUST be **free of charge**. The system MUST NOT pre-select any
  option that increases the price. *(Polish law: a paid default is refundable on demand.)*
- **FR-012**: The system MUST support ordering **multiple figurines with different designs in a
  single order**, with a published per-unit quantity ladder.
- **FR-013**: If background removal fails or the customer chooses, the system MUST allow **ordering
  with the photo deferred**, collecting it afterwards, without losing the configuration.

### Functional Requirements — Cart, checkout & delivery

- **FR-014**: The cart MUST persist across the session and preserve each item's full configuration.
- **FR-015**: Checkout MUST be available **as a guest**; creating an account MUST NOT be required.
- **FR-016**: The system MUST accept **card, BLIK, and Przelewy24**, with BLIK presented as a
  first-class option rather than hidden inside an aggregator.
- **FR-017**: The system MUST offer **InPost Paczkomat with in-checkout locker selection**, plus a
  courier option.
- **FR-018**: The system MUST show a **delivery date range** — with production time already
  included — rather than a lead time in working days. The quoted window SHOULD NOT exceed 7 days,
  and the system MUST NOT display a date it does not expect to meet.
- **FR-019**: The system MUST apply a free-delivery threshold and show progress toward it.
- **FR-020**: The system MUST send an order-confirmation email.
- **FR-021**: The checkout MUST NOT use countdown timers that restart per session or per visit.

### Functional Requirements — Production

- **FR-022**: On successful payment the system MUST persist the complete Design State (character
  selections, face photo reference and transform, text, options) together with a snapshot of the
  Product Schema version.
- **FR-023**: The system MUST automatically generate a production package: a **300 DPI print file**
  (PNG/PDF/SVG), a **separate cut-contour layer**, a **JSON parameter specification**, and a
  **preview image** — with no manual preparation.
- **FR-024**: The production output MUST correspond to the preview the customer approved.

### Functional Requirements — Admin

- **FR-025**: Staff MUST be able to view an order's full configuration and download its production
  package.
- **FR-026**: Staff MUST be able to edit prices and constructor options, publishing a new schema
  version without affecting existing orders.
- **FR-027**: Staff MUST be able to export orders to CSV/Excel.
- **FR-028**: Staff MUST be alerted when an order needs attention (render failure, deferred photo).

### Functional Requirements — Trust, legal & compliance

- **FR-029**: The system MUST determine the **14-day withdrawal right per order line at purchase
  time**: lines carrying customer personalization (face photo and/or custom text) are exempt;
  lines configured only from standard options are **not** exempt and retain the right.
- **FR-030**: Where the withdrawal right does not apply, the system MUST inform the customer
  **clearly, in plain language, before they are bound** — adjacent to the payment action, not only
  in the terms — and MUST **record which version of that notice the order saw**.
- **FR-031**: The system MUST present a **voluntary guarantee** alongside the withdrawal notice
  (design approval before production; remake or refund if the item is wrong), never the exclusion
  alone.
- **FR-032**: The system MUST capture explicit consent for photo processing before purchase.
- **FR-033**: Uploaded photos MUST be stored privately with time-limited signed access and
  encryption at rest.
- **FR-034**: Photos and personal data MUST be retained for a defined period (**60 days** after
  fulfilment) and then deleted automatically; deletion on request MUST be supported at any time.
- **FR-035**: Analytics and marketing tags MUST NOT load before cookie consent is granted.
- **FR-036**: The system MUST provide localized informational and legal pages — Terms (Regulamin),
  Privacy Policy, Cookie Policy, Returns & Complaints, Shipping & Delivery, Contact — editable by
  staff without a developer. The Terms MUST NOT claim to *create* a returns exclusion, and MUST NOT
  link to the discontinued EU ODR platform.
- **FR-037**: The system MUST display the seller's identity (company name, Polish address, tax id,
  contact) accessibly.
- **FR-038**: Where reviews are displayed, the system MUST state whether and how they are verified,
  and MUST mark reviews from confirmed buyers.
- **FR-039**: If a price reduction is ever displayed, the system MUST also display the lowest price
  of the preceding 30 days. The data model MUST retain price history to make this possible. *(No
  discounts are planned for launch; the capability must exist before any is shown, including in
  advertising.)*

### Functional Requirements — Reach & performance

- **FR-040**: The system MUST serve Polish (default), English, and Ukrainian with a language
  switch and correct hreflang; adding or removing a locale MUST NOT require reworking features.
- **FR-041**: The system MUST provide base SEO: unique title/description per page, sitemap.xml,
  robots.txt, canonical URLs, hreflang alternates.
- **FR-042**: The storefront MUST be mobile-first, with the constructor lazy-loaded so it never
  blocks first paint.
- **FR-043**: The purchase action MUST remain reachable on mobile via a sticky element that
  **completes the action in place** rather than scrolling the user elsewhere.
- **FR-044**: The system MUST provide an **ad-traffic entry page that contains no file upload**,
  so that link-preloading by ad platforms cannot trigger uploads; the constructor opens on an
  explicit user action.
- **FR-045**: The system MUST measure real-user performance from real visitors (including in-app
  browsers) rather than relying only on third-party field datasets, and MUST exclude ad-platform
  preload bots from analytics.
- **FR-046**: Daily database backups with point-in-time recovery and file versioning MUST be in
  place.

### Key Entities *(include if data involved)*

- **Product Schema**: Versioned definition of a personalizable product — character variant sets,
  face zone, text fields, free options, fixed physical spec (size, magnetic backing), constraints,
  quantity-based pricing (quantity ladder), and cut-contour. The single source of what a product
  allows.
- **Design State**: One customer's configuration — chosen character variants, face photo reference
  and its transform, text values, selected options, quantity — plus the schema version it was built
  against.
- **Uploaded Photo**: A customer face photo, private, consented, retention-bound, with its
  background-removed derivative.
- **Order**: A purchase referencing one or more Design States, each with its withdrawal-right flag
  and the version of the legal notice shown, plus references to production packages.
- **Production Package**: Manufacturing output for an order line — print file, cut-contour layer,
  parameter specification, preview.
- **Content Page**: A localized, staff-editable informational or legal page.
- **Consent Record**: Evidence of photo-processing and cookie consent, with timestamp and scope.
- **Price History**: Dated record of a product's price, enabling lawful display of any future
  reduction.
- **Review**: A customer review with rating, optional photo, and verified-buyer status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A shopper can go from opening the product page to a paid order on a phone in under
  5 minutes.
- **SC-002**: For test orders, the production file matches the customer's approved preview 100% of
  the time and is print-ready at 300 DPI with a valid, closed cut contour.
- **SC-003**: Every completed configuration renders a correct preview — no design reaches checkout
  showing artwork the customer would not recognise as their own.
- **SC-004**: Constructor completion rate is measured and reported; abandonment is attributable to
  a specific step.
- **SC-005**: Staff can retrieve everything needed to manufacture and fulfil any order in under
  1 minute.
- **SC-006**: Zero analytics or marketing network calls occur before consent is granted.
- **SC-007**: A customer's photo and personal data are removed within the stated window after a
  valid request, and automatically at retention expiry.
- **SC-008**: Storefront and product pages meet mobile Core Web Vitals "good" thresholds, measured
  on real visitors including in-app browsers.
- **SC-009**: The store is fully usable in Polish, English, and Ukrainian with correct hreflang on
  every public page.
- **SC-010**: Every paid order results in a stored Design State and either a generated production
  package or an explicit "awaiting photo" state — never silently nothing.
- **SC-011**: No order can be completed with a pre-selected option the customer did not choose that
  increased its price.

## Assumptions

- **Product.** The figurine is acrylic (UV print) with a soft silicone belly element, hand-sized,
  in a **single format** (~11 cm / 4.3") with a **magnetic backing built into every unit**. The
  character body is supplied as catalogue artwork; the customer contributes a face photo and a name,
  printed on the figurine itself. Exact dimensions, prices, and the cut-contour specification come
  from the client and their production partner; until then, benchmark values are used as
  configuration, not code.
- **Provisional catalogue:** single size 11 cm (4.3"); flat **base 79 zł** with a per-unit quantity
  ladder (1 pc 79 · 3 pcs 65/ea · 6 pcs 49/ea); **every option free**; magnetic backing included;
  currency PLN; market Poland. The free-delivery threshold is set where Polish shoppers already
  expect it rather than above it.
- **Payment methods** are card, BLIK, and Przelewy24. **Cash on delivery is not offered at launch**:
  a refused parcel leaves an unsellable personalized item. The architecture keeps it addable if the
  client accepts that risk.
- **No price reductions are shown at launch.** Price history exists so that any future discount —
  on-site or in advertising — can be shown lawfully.
- **Legal copy** (Terms, Privacy, Cookies, Returns, Shipping) is supplied by the client or their
  lawyer, drafted for Polish law and this store's actual data processing. This feature implements
  structure, localization, admin editing, and the per-line withdrawal logic — not the legal wording.
- **The uk locale is temporary** (development-stage) and removable via configuration.
- **Hosting and all service accounts** are the client's, so the platform transfers in full.
- **Delivery stages are a commercial framing, not a technical dependency**: the system is built as
  one coherent architecture, and capabilities are sequenced to keep the product functional at every
  demo — background removal is part of the core because the product cannot work without it.
- **Out of scope for this feature** (architecture stays ready): visual no-code template editor,
  promo codes / gift certificates / active discounting, extended analytics dashboards, AI character
  generation and photo enhancement beyond background removal, ERP/CRM, and carrier integrations
  beyond the checkout delivery choice.

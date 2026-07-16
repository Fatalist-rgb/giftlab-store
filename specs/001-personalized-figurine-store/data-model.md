# Phase 1 Data Model: Personalized Figurine Storefront (Stage 1)

**Revised**: 2026-07-16 (rev 2 — character-based product model, per-line withdrawal, price history)

Conceptual model. Medusa owns standard commerce entities (Product, Variant, Cart, Order, Payment,
Customer); the entities below are **custom** or **extensions** linked to Medusa records. Storage:
PostgreSQL. Files (photos, packages, artwork) live in R2; the DB stores keys/metadata only.

> **Model shift (rev 2).** The figurine is **catalogue artwork + the customer's face**, not the
> customer's whole photo. That is what makes the live preview trustworthy (FR-008) and it moves
> background removal into the core (FR-003). Everything below follows from that.

## ProductSchema

The versioned definition that makes the constructor data-driven (FR-010).

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| medusa_product_id | string | links to the Medusa product |
| version | int | monotonic; bumped on any change |
| status | enum(`draft`,`published`,`archived`) | only `published` is orderable |
| character_layers | json[] | ordered artwork layers; each: `id`, `label` (i18n), `z_index`, `variants[]` |
| ↳ variants[] | json[] | each: `id`, `label` (i18n), `asset_key` (R2 vector/raster), `price_delta` (usually 0) |
| face_zone | json | `bounds`, `mask_asset_key`, `min_resolution_px`, allowed transforms |
| text_fields | json[] | each: `id`, `label` (i18n), `max_len`, `fonts[]`, `colors[]`, placement |
| options | json[] | each: `id`, `type`(size/base/select), `values[]` (+`price_delta`, `dimensions_mm`), `default` |
| accessories | json[] | each: `id`, `label`, `price_delta`, `incompatible_with[]` |
| constraints | json | cross-field rules (e.g. size ↔ face-zone bounds) |
| pricing_rules | json | base per size + deltas + **quantity_ladder** |
| ↳ quantity_ladder | json[] | each: `min_qty`, `unit_price` — powers FR-012 |
| cut_contour | json | contour source, offset/bleed mm, spot name (default `CutContour`) |
| created_at | timestamptz | |

**Validation**: zod contract (see contracts/constructor-schema.md). `published` requires ≥1
character layer, a resolvable `face_zone`, and a cut contour.
**Free-default invariant (FR-011)**: publication MUST reject a schema whose default selection has a
non-zero total `price_delta`. *Enforced in code, not left to editorial discipline — a paid default is
legally refundable.*
**Immutability**: a published version is never mutated; edits create a new version so existing
orders stay reproducible.

## DesignState

One customer's configuration against one ProductSchema version (FR-022).

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| product_schema_id | uuid | FK → ProductSchema |
| schema_version | int | snapshot of the version used |
| character_selections | json | `layer_id` → `variant_id` |
| face_layer | json | `uploaded_photo_id`, `x`, `y`, `scale`, `rotation` (nullable — deferred photo) |
| text_values | json[] | each: `field_id`, `value`, `font`, `color` |
| selected_options | json | `option_id` → `value` |
| selected_accessories | string[] | accessory ids |
| photo_status | enum(`ready`,`deferred`,`processing`,`failed`) | supports FR-013 |
| computed_price | int | minor units (grosz); server-authoritative |
| is_personalized | bool | derived: true if face photo and/or non-empty text — drives FR-029 |
| created_at | timestamptz | |

**Validation**: every referenced id MUST exist in the referenced schema version; transforms within
zone bounds; price recomputed server-side on add-to-cart and at order placement (never trust the
client).
**Resolution (FR-004)**: insufficient photo resolution sets a warning on the state — it does **not**
invalidate it and never blocks checkout.
**Relationships**: DesignState 1—1 CartLineItem (draft) and 1—1 OrderLineItem (frozen at purchase).
A single cart/order may hold **many** DesignStates (FR-012 — different designs, one order).

## UploadedPhoto

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| original_key | string | private R2 key (normalized master: HEIC→raster, EXIF applied, metadata stripped) |
| cutout_key | string | background-removed derivative (nullable until processed) |
| preview_key | string | downscaled web preview |
| mime / width_px / height_px | string/int | after normalization |
| cutout_status | enum(`pending`,`ready`,`failed`) | drives constructor progress UI (FR-003) |
| checksum | string | dedupe/integrity |
| consent_id | uuid | FK → ConsentRecord (photo processing, FR-032) |
| expires_at | timestamptz | retention deadline — **60 days after fulfilment** (FR-034) |
| status | enum(`active`,`deleted`) | |

**State**: `active` → `deleted` (retention job at `expires_at`, or deletion request). Deletion
removes original, cutout, and preview objects and clears references.

## Order (Medusa extension)

Standard Medusa Order + per-line manufacturing and legal snapshots.

| Field | Type | Notes |
|-------|------|-------|
| medusa_order_id | string | PK/link |
| delivery_date_from / delivery_date_to | date | the window **shown and promised** at checkout (FR-018) |

### OrderLine (extension) — one per figurine

| Field | Type | Notes |
|-------|------|-------|
| medusa_line_item_id | string | PK/link |
| design_state_id | uuid | FK → DesignState (frozen) |
| schema_version | int | snapshot |
| production_package_id | uuid | FK → ProductionPackage (nullable) |
| render_status | enum(`queued`,`processing`,`ready`,`failed`,`awaiting_photo`) | |
| withdrawal_right | enum(`excluded`,`applies`) | **computed per line at purchase** (FR-029) |
| withdrawal_notice_version | string | which notice text this buyer saw (FR-030) |

**Why per line, not per order (FR-029)**: the statutory exclusion attaches to *personalization*, not
to the product line. A figurine with a face photo and/or a name is excluded; a line configured only
from standard options is **not** — it keeps the ordinary 14-day right. A blanket exclusion would be
both wrong and an unfair-term risk.
**Why the notice version is stored (FR-030)**: the burden of proving the customer was informed sits
with the seller. The proof must be reconstructable per order.

## ProductionPackage

One per order line.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| order_line_id | string | FK → OrderLine |
| print_png_key / print_pdf_key / cut_svg_key | string | R2 keys — 300 DPI raster, PDF with CutContour spot, vector cut path |
| spec_json_key / preview_key | string | parameter spec + customer-facing preview |
| dpi | int | 300 |
| render_engine_version | string | reproducibility |
| created_at | timestamptz | |

**State**: `queued` → `processing` → `ready` | `failed` (retryable; final failure alerts staff,
FR-028). `awaiting_photo` when the customer deferred the photo (FR-013); generation starts once the
photo arrives. Satisfies SC-002/SC-010.

## ContentPage

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| slug | string | `regulamin`, `privacy`, `cookies`, `zwroty`, `dostawa`, `kontakt` |
| locale | enum(`pl`,`en`,`uk`) | one row per (slug, locale) |
| title / body / meta_title / meta_description | text | admin-editable (FR-036) |
| updated_at | timestamptz | |

**Validation**: `pl` required per slug; `en`/`uk` fall back to `pl`. Unique on (slug, locale).

## ConsentRecord

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| type | enum(`photo_processing`,`cookies`) | FR-032 / FR-035 |
| categories | string[] | for cookies (analytics/marketing) |
| subject_ref | string | session / customer / order ref |
| granted_at | timestamptz | |
| ip_hash / user_agent | string | minimized audit |

## PriceHistory

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| medusa_product_id | string | |
| variant_key | string | e.g. size |
| price | int | minor units |
| effective_from | timestamptz | |

**Purpose (FR-039)**: no discounts are shown at launch, but **the moment any reduction is displayed
— on-site or in an ad — the lowest price of the previous 30 days must be shown beside it.** That is
computable only if history exists from day one. Cheap now; impossible retroactively.

## Review

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| medusa_product_id | string | |
| rating | int | 1–5 |
| body | text | |
| photo_key | string | optional, R2 |
| verified_buyer | bool | derived from a matching order (FR-038) |
| locale | enum | |
| published_at | timestamptz | |

**Note**: the storefront must state whether and how reviews are verified. Verified-buyer marking is
a display requirement, not decoration.

## Relationships (summary)

```text
ProductSchema 1─* DesignState *─0..1 UploadedPhoto (face)
DesignState 1─1 OrderLine 1─0..1 ProductionPackage
Order 1─* OrderLine                      (bulk: many designs, one order)
UploadedPhoto *─1 ConsentRecord(photo_processing)
Medusa: Product ─ ProductSchema(medusa_product_id) ─ PriceHistory ─ Review
ContentPage: (slug, locale) unique
```

## Cross-cutting rules

- **Price authority**: the server recomputes price from schema + DesignState; the client value is
  advisory. Quantity ladder applies across the order's personalized lines.
- **Free defaults (FR-011)**: enforced at schema publication, re-checked at add-to-cart.
- **Reproducibility (Principle II)**: OrderLine freezes `design_state_id` + `schema_version`;
  ProductionPackage records `render_engine_version`.
- **Privacy (Principle V)**: photos private in R2, `expires_at` enforced, deletable on request; the
  cutout derivative shares the parent's lifecycle.
- **Legal provability**: `withdrawal_right` + `withdrawal_notice_version` are written at purchase
  and never recomputed afterwards.

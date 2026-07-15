# Phase 1 Data Model: Personalized Figurine Storefront (Stage 1)

Conceptual model. Medusa owns standard commerce entities (Product, Variant, Cart, Order,
Payment, Customer); the entities below are **custom** or **extensions** linked to Medusa records.
Storage: PostgreSQL. Files (photos, packages) live in R2; DB stores keys/metadata only.

## ProductSchema

The versioned definition that makes the constructor data-driven. One logical schema per product;
many immutable versions over time.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| medusa_product_id | string | links to the Medusa product |
| version | int | monotonic; bumped on any change |
| status | enum(`draft`,`published`,`archived`) | only `published` is orderable |
| photo_zones | json[] | each: id, shape/bounds, min_resolution_px, allowed_transforms |
| text_fields | json[] | each: id, label, max_len, allowed_fonts[], color_options[] |
| options | json[] | each: id, type(size/base/select), values[], default |
| accessories | json[] | each: id, label, price_delta, incompatible_with[] |
| constraints | json | cross-field rules (e.g., size↔zone bounds) |
| pricing_rules | json | base by size + option/accessory deltas + qty behavior |
| cut_contour | json | contour source, offset/bleed, spot name (default `CutContour`) |
| created_at | timestamptz | |

**Validation**: schema validated by a zod contract (see contracts/constructor-schema.md);
`published` requires ≥1 photo_zone and a resolvable cut_contour. **Immutability**: a published
version is never mutated — edits create a new version so existing orders stay reproducible.

## DesignState

A customer's concrete configuration against one ProductSchema version.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| product_schema_id | uuid | FK → ProductSchema |
| schema_version | int | snapshot of the version used |
| photo_layers | json[] | each: uploaded_photo_id, zone_id, x, y, scale, rotation |
| text_values | json[] | each: field_id, value, font, color |
| selected_options | json | option_id → value |
| selected_accessories | string[] | accessory ids |
| quantity | int | ≥1 |
| computed_price | int | minor units (grosz); recomputed server-side authoritatively |
| created_at | timestamptz | |

**Validation**: every referenced id MUST exist in the referenced schema version; transforms
within zone bounds; resolution gate (FR-002) passes; `computed_price` recomputed and verified on
add-to-cart and at order placement (never trust client price).

**Relationships**: DesignState 1—1 CartLineItem (draft) and 1—1 OrderLineItem (final, frozen).

## UploadedPhoto

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| r2_key | string | private object key (normalized master) |
| preview_r2_key | string | downscaled web preview |
| mime | string | normalized (jpeg/png) |
| width_px / height_px | int | after EXIF normalization |
| checksum | string | dedupe/integrity |
| consent_id | uuid | FK → ConsentRecord (photo processing) |
| expires_at | timestamptz | retention deadline (auto-delete) |
| status | enum(`active`,`deleted`) | |
| created_at | timestamptz | |

**State**: `active` → `deleted` (retention job at `expires_at`, or deletion request). Deletion
removes the R2 objects and clears references.

## Order (Medusa extension)

Standard Medusa Order + a linked snapshot for manufacturing.

| Field | Type | Notes |
|-------|------|-------|
| medusa_order_id | string | PK/link |
| design_state_id | uuid | FK → DesignState (frozen at placement) |
| schema_version | int | snapshot |
| production_package_id | uuid | FK → ProductionPackage (nullable until rendered) |
| render_status | enum(`queued`,`processing`,`ready`,`failed`) | |

## ProductionPackage

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| order_id | string | FK → Medusa order |
| print_png_key | string | R2 key, 300 DPI raster |
| print_pdf_key | string | R2 key, raster + CutContour spot |
| cut_svg_key | string | R2 key, vector cut path |
| spec_json_key | string | R2 key, parameter spec |
| preview_key | string | R2 key, customer-facing preview |
| dpi | int | 300 |
| render_engine_version | string | for reproducibility |
| created_at | timestamptz | |

**State (render job)**: `queued` → `processing` → `ready` | `failed` (retryable; final `failed`
raises an admin alert). A `ready` package satisfies SC-002/SC-008.

## ContentPage

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| slug | string | e.g. `regulamin`, `privacy`, `cookies`, `zwroty`, `dostawa`, `kontakt` |
| locale | enum(`pl`,`en`,`uk`) | one row per (slug, locale) |
| title | string | |
| body | rich text | admin-editable |
| meta_title / meta_description | string | SEO |
| updated_at | timestamptz | |

**Validation**: `pl` required for each slug; `en`/`uk` fall back to `pl` if missing.

## ConsentRecord

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| type | enum(`photo_processing`,`cookies`) | |
| categories | string[] | for cookies (analytics/marketing) |
| subject_ref | string | session/customer/order ref |
| granted_at | timestamptz | |
| ip_hash / user_agent | string | audit (minimized) |

## Relationships (summary)

```text
ProductSchema 1─* DesignState *─1 UploadedPhoto (per photo layer)
DesignState 1─1 Order(ext) 1─0..1 ProductionPackage
UploadedPhoto *─1 ConsentRecord(photo_processing)
ContentPage: (slug, locale) unique
Medusa: Product ─ ProductSchema(medusa_product_id); Order/Cart/Payment native
```

## Cross-cutting rules

- **Price authority**: server recomputes price from schema + DesignState; client value is
  advisory only.
- **Reproducibility**: Order freezes `design_state_id` + `schema_version`; ProductionPackage
  records `render_engine_version` (Principle II).
- **Privacy**: photos private in R2, `expires_at` enforced, deletable on request (Principle V).

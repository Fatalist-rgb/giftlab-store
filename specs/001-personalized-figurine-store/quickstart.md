# Quickstart & Validation: Personalized Figurine Storefront (Stage 1)

How to run the stack locally and prove the feature works end-to-end. Details live in
[data-model.md](data-model.md) and [contracts/](contracts/) — this is a run/validation guide,
not implementation.

## Prerequisites

- Node.js 20 LTS + `pnpm`
- PostgreSQL 16 + Redis (local: Docker `postgres:16`, `redis:7`)
- Cloudflare R2 bucket (or S3-compatible) + credentials
- `.env` per `packages/config` env schema (DB URL, REDIS URL, R2 keys, payment test keys,
  next-intl locales, GTM id)

## Install & run (from repo root — ASCII subpaths only)

```bash
pnpm install
pnpm --filter @gl/medusa db:migrate       # Medusa + custom tables
pnpm --filter @gl/medusa seed:figurine     # seed one product + its published ProductSchema
pnpm dev                                   # turbo: storefront + medusa + render-worker
```

- Storefront: http://localhost:3000 (locales `/pl`, `/en`, `/uk`)
- Medusa admin: http://localhost:9000/app
- Worker: consumes `gl:render` from Redis

## Validation scenarios (map to spec Success Criteria)

### V1 — Design → order → production package (P1, SC-001/002/008)
1. Open `/pl` product page on a mobile viewport; the constructor lazy-loads.
2. Upload a HEIC photo → it converts, appears upright (EXIF), passes the resolution gate.
3. Move/scale/rotate the photo, type a name, pick size L + an accessory → preview + price update
   live (price = `computePrice`, verified against `POST /store/gl/price`).
4. Add to cart → checkout → pay with **BLIK** (test) → order placed; confirmation email sent.
5. Worker renders; `GET /store/gl/orders/:id/render-status` → `ready`.
6. Admin → order → download package: PNG (300 DPI), PDF (with `CutContour` spot), SVG cut path,
   `spec.json`, preview. **Assert** the print preview matches step 3 (golden-image test).

### V2 — Fidelity golden test (Principle II, SC-002)
`pnpm --filter @gl/constructor test:golden` renders a fixed DesignState in browser (Playwright)
and in Node (`@napi-rs/canvas`); asserts pixel-equivalence within tolerance.

### V3 — Consent gating (P3, SC-004)
Load storefront with a network recorder; **assert zero** GA4/Meta/GTM calls before accepting the
cookie banner; after accept, tags load via GTM.

### V4 — i18n + SEO (P3, SC-007)
Switch `/pl` → `/en` → `/uk`; all UI strings change; `hreflang` alternates present; each page has
unique title/description; `sitemap.xml` + `robots.txt` served.

### V5 — Legal/content pages (FR-026/027)
Footer links open localized Regulamin/Privacy/Cookies/Zwroty/Dostawa/Kontakt; checkout blocks
payment until Terms accepted + Privacy acknowledged.

### V6 — Privacy/RODO (P3, SC-005)
Uploaded photos are private (direct R2 URL → 403; only signed URLs work); trigger a deletion
request → photo objects removed and references cleared; retention job deletes at `expires_at`.

## Test commands

```bash
pnpm test                 # unit (Vitest) across packages
pnpm --filter @gl/constructor test:golden
pnpm --filter @gl/storefront test:e2e     # Playwright: V1, V3, V4, V5
pnpm lint && pnpm typecheck
```

## Definition of done (Stage 1 demo)

All of V1–V6 pass on staging; mobile Core Web Vitals green on storefront + product page; every
paid test order yields a `ready` ProductionPackage matching its preview.

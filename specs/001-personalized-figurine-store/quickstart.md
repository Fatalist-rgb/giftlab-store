# Quickstart & Validation: Personalized Figurine Storefront (Stage 1)

**Revised**: 2026-07-16 (rev 2)

How to run the stack locally and prove the feature works end-to-end. Details live in
[data-model.md](data-model.md) and [contracts/](contracts/) — this is a run/validation guide,
not implementation.

## Prerequisites

- Node.js 20 LTS + `pnpm`
- PostgreSQL 16 + Redis (local: Docker `postgres:16`, `redis:7`)
- Cloudflare R2 bucket (or S3-compatible) + credentials
- A background-removal provider key (or run with the mock adapter from `packages/cutout`)
- `.env` per `packages/config` env schema

## Install & run (from repo root — ASCII subpaths only)

```bash
pnpm install
pnpm --filter @gl/medusa db:migrate        # Medusa + custom tables
pnpm --filter @gl/medusa seed:artwork      # character variants + face mask -> R2
pnpm --filter @gl/medusa seed:figurine     # product + published ProductSchema
pnpm dev                                   # storefront + medusa + render-worker
```

- Storefront: http://localhost:3000 (locales `/pl`, `/en`, `/uk`)
- Medusa admin: http://localhost:9000/app
- Worker: consumes `gl:render` and `gl:cutout`

## Validation scenarios (map to spec Success Criteria)

### V1 — Design → order → production package (P1, SC-001/002/010)
1. Open `/pl` product page on a mobile viewport; the constructor lazy-loads.
2. Pick character options (body, skin tone, outfit) → preview updates and **always renders**.
3. Upload a HEIC face photo → converts, appears upright, **background removed automatically** with
   visible progress, lands in the face zone.
4. Reposition/scale/rotate the face, type a name, set the quantity to 3 → preview and price update
   live; price shows the **quantity-ladder saving** (every option is free).
5. Add to cart → checkout **as guest** → InPost locker picked → pay with **BLIK** (test) → order
   placed; confirmation email sent.
6. Worker renders; `render-status` → `ready`.
7. Admin → order line → download package: PNG (300 DPI), PDF (with `CutContour` spot), SVG cut
   path, `spec.json`, preview. **Assert** the print matches step 4 (golden-image test).

### V2 — Fidelity golden test (Principle II, SC-002)
`pnpm --filter @gl/constructor test:golden` renders a fixed DesignState in browser (Playwright) and
in Node (`@napi-rs/canvas`); asserts pixel-equivalence within tolerance.

### V3 — Photo edge cases (SC-003, FR-004/FR-013)
- Upload a low-resolution photo → **warning with a remedy appears; checkout is NOT blocked**.
- Force the cutout adapter to fail → shopper can retry, swap the photo, or **order with the photo
  deferred**; the order shows `awaiting_photo`; attaching the photo later triggers the render.

### V4 — Legal invariants (SC-011, Principle VIII)
- **Free defaults:** the default configuration costs the base price; attempt to publish a schema
  whose default carries a price delta → rejected (422).
- **Withdrawal right:** a line with a face photo and/or name → `excluded`, and the notice is shown
  **beside the pay button** with the guarantee; a line with only standard options → `applies`.
- The order records `withdrawal_notice_version`.
- No countdown timer restarts on reload.

### V5 — Consent gating (P3, SC-006)
Load the storefront with a network recorder; **assert zero** GA4/Meta/GTM calls before accepting
the cookie banner; after accept, tags load via GTM.

### V6 — i18n + SEO (P3, SC-009)
Switch `/pl` → `/en` → `/uk`; all strings change; `hreflang` alternates present; unique
title/description per page; `sitemap.xml` + `robots.txt` served.

### V7 — Privacy/RODO (P3, SC-007)
Photos are private (direct R2 URL → 403; only signed URLs work); a deletion request removes
original + cutout + preview; the retention job deletes at `expires_at` (60 days after fulfilment).

### V8 — Ad traffic (FR-044/FR-045, SC-008)
- The ad entry page exposes **no upload control**; the constructor opens on explicit action.
- A request carrying an ad-platform preload user agent is **not** counted as a visit and triggers
  no tracking.
- RUM reports Core Web Vitals from real sessions, including in-app browsers.

## Test commands

```bash
pnpm test                                  # unit (Vitest) across packages
pnpm --filter @gl/constructor test:golden
pnpm --filter @gl/storefront test:e2e      # Playwright: V1, V3, V4, V5, V6
pnpm lint && pnpm typecheck
```

## Definition of done (demo)

V1–V8 pass on staging; mobile Core Web Vitals green on real sessions; every paid test order yields
either a `ready` package matching its preview or an explicit `awaiting_photo` state; the three
release-blocking tests (golden image, free defaults, withdrawal right) are green.

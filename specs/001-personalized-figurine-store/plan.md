# Implementation Plan: Personalized Figurine Storefront (Stage 1 MVP)

**Branch**: `001-personalized-figurine-store` | **Date**: 2026-07-16 | **Revised**: 2026-07-16 (rev 2) | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-personalized-figurine-store/spec.md`

## Summary

A mobile-first storefront where a shopper builds a personalized acrylic figurine: they pick a
**character from catalogue artwork**, upload a **face photo** whose background is **removed
automatically**, add a name, choose the quantity, and pay with card/BLIK/Przelewy24. Because the
body is catalogue artwork and the face arrives background-free, the live preview is trustworthy —
and the same shared **Design State** + rendering module produces the 300 DPI production file with a
separate CutContour layer, guaranteeing "what the customer approved is what gets printed".

Commerce (catalog, cart, orders, admin, CSV export) runs on **Medusa**; background removal is a
hosted service behind an adapter; the manufacturing render runs asynchronously via a **BullMQ/Redis**
worker; photos, artwork, and production files live privately in **Cloudflare R2**. The storefront is
trilingual (pl/en/uk) with consent-gated analytics, base SEO, RODO-compliant photo handling, and
Polish consumer-law rules enforced in code (free defaults, per-line withdrawal right, price history).

**Revision note (rev 2)**: the product model changed from "customer's photo inside a silhouette" to
"catalogue character + customer's face + automatic cutout". This is what makes a truthful live
preview possible and moves background removal into the core. Delivery stages are commercial framing
and do not gate technical sequencing.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS (all apps).

**Primary Dependencies**: Next.js 15 (App Router) + React 18 + Tailwind + shadcn/ui
(storefront); Medusa v2 (commerce/admin) with `@medusajs/*`; `react-konva`/`konva` (editor) and
`@napi-rs/canvas` or `skia-canvas` (server render); `bullmq` + `ioredis` (queue); AWS SDK v3
S3 client for Cloudflare R2; `sharp` + `heic-convert` (image normalization/HEIC); a hosted
**background-removal API behind our own adapter interface** (provider chosen at implementation;
adapter keeps it swappable and testable); `next-intl` (i18n); `pdf-lib`/`pdfkit` (PDF with
CutContour spot color); `web-vitals` (real-user monitoring).

**Storage**: PostgreSQL 16 (Medusa data + custom tables); Cloudflare R2 (private objects:
uploaded photos + cutouts, character artwork, production packages) with object versioning.

**Testing**: Vitest (unit — `packages/constructor` render/pricing), Playwright (storefront E2E:
design→checkout, consent gating, i18n), contract tests for custom endpoints, and a golden-image
fidelity test (preview vs production render).

**Target Platform**: Web (modern browsers, iOS/Android). Storefront → Vercel; Medusa + render
worker + Redis + Postgres → a Node-capable host on the client's accounts (see research.md).

**Project Type**: Web application — monorepo (storefront + commerce backend + render worker +
shared packages).

**Performance Goals**: Green mobile Core Web Vitals (LCP < 2.5s, INP < 200ms, CLS < 0.1) on
storefront + product page; constructor lazy-loaded; production render completes < 60s p95.

**Constraints**: Production file = 300 DPI with a valid closed CutContour; preview↔production
fidelity 100% on golden tests; photos private (signed URLs, encryption at rest); no analytics
before consent; **repo root path is Cyrillic + `$` → all app/build code MUST live under ASCII
`apps/*` and `packages/*`; tooling must never depend on the repo-root folder name**.

**Scale/Scope**: Stage 1 = one product, one primary photo zone + one text field; catalog
designed for many products via schemas. Launch traffic from paid social; absorb spikes via the
async render queue.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | How this plan satisfies it | Status |
|---|-----------|----------------------------|--------|
| I | Data-Driven Constructor | Product Schema (versioned JSON) declares character layers/variants, face zone, free options (priced add-ons = options with a non-zero delta), fixed physical spec, quantity-based pricing, cut-contour; no per-product code; `packages/constructor` is schema-generic | ✅ PASS |
| II | Production-File Fidelity | One `packages/constructor` render module used by preview (Konva/browser) and worker (server canvas); catalogue artwork + background-free face make the render deterministic; order line stores Design State + schema-version snapshot; golden-image fidelity test | ✅ PASS |
| III | i18n by Architecture | `next-intl` catalogs (pl/en/uk), localized routing + hreflang; add/remove a locale = catalog + config only | ✅ PASS |
| IV | Mobile-First Performance | Constructor lazy-loaded (dynamic import); upload-free ad entry page; sticky buy drawer completing in place; RUM from real in-app-browser visitors | ✅ PASS |
| V | Privacy & RODO (NON-NEGOTIABLE) | R2 private + signed URLs + encryption; explicit photo consent; 60-day retention job + deletion endpoint; consent-gated GTM (art. 399 PKE) | ✅ PASS |
| VI | Ownership & Maintainability | All infra on client accounts; typed + documented monorepo; Git from day 1 + staging; admin guide deliverable | ✅ PASS |
| VII | Modular, Testable Boundaries | Five bounded modules (storefront, medusa, render-worker, constructor pkg, cutout adapter) with explicit contracts; critical-path tests incl. withdrawal-right computation | ✅ PASS |
| VIII | Lawful Commerce (NON-NEGOTIABLE) | Free-default invariant enforced at schema publication + add-to-cart; withdrawal right + notice version written per order line; PriceHistory from day one; no resetting timers; promised delivery date stored per order | ✅ PASS |

**Result**: PASS (no violations). The multi-app monorepo is *mandated* by Principle VII, not a
complexity violation (see Complexity Tracking). Background removal sits in the core per the
constitution's Development Workflow section — the product cannot render a truthful preview without
it.

## Project Structure

### Documentation (this feature)

```text
specs/001-personalized-figurine-store/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 — decisions & rationale
├── data-model.md        # Phase 1 — entities & relationships
├── quickstart.md        # Phase 1 — run & validate guide
├── contracts/           # Phase 1 — interface contracts
│   ├── README.md
│   ├── constructor-schema.md
│   ├── storefront-api.md
│   └── render-job.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root — ASCII subfolders only)

```text
apps/
├── storefront/                 # Next.js 15 (App Router, TS) -> Vercel
│   ├── src/app/[locale]/       # localized routes (pl/en/uk) + legal/content pages
│   │   └── (ads)/              # upload-free ad entry pages (safe for link preloading)
│   ├── src/features/constructor/   # lazy-loaded Konva editor (uses packages/constructor)
│   ├── src/features/checkout/  # cart + checkout (Medusa store API + payment + legal notice)
│   ├── src/lib/                # medusa client, r2 upload, analytics/consent, seo, rum
│   └── tests/                  # Playwright E2E
├── medusa/                     # Medusa v2 commerce backend + admin
│   ├── src/modules/            # custom: product-schema, design-state, production-package,
│   │                           #         content-page, consent, price-history, review
│   ├── src/api/                # custom routes (upload sign/finalize, cutout, price,
│   │                           #         render status, package, export)
│   ├── src/subscribers/        # order.placed -> freeze design, compute withdrawal, enqueue render
│   ├── src/jobs/               # photo retention (60d), price-history snapshot
│   └── src/admin/              # admin widgets (view design, download package, flags)
└── render-worker/              # BullMQ consumer (Node)
    ├── src/                    # job processor -> packages/constructor server render -> R2
    └── tests/

packages/
├── constructor/                # SHARED: schema types, Design State, pricing, render core
│   ├── src/schema/             # Product Schema types + validation (zod) + free-default invariant
│   ├── src/design-state/       # Design State types + (de)serialization + versioning
│   ├── src/render/             # scene builder (shared) + browser + server adapters + fonts
│   ├── src/pricing/            # deterministic price + quantity ladder
│   ├── src/legal/              # per-line withdrawal-right computation (pure, testable)
│   └── tests/                  # unit + golden-image fidelity
├── cutout/                     # background-removal adapter (provider-agnostic interface + mock)
└── config/                     # shared tsconfig, eslint, env schema

# Root: pnpm workspace (pnpm-workspace.yaml), optional turbo, .env.example
```

**Structure Decision**: pnpm monorepo. The **constructor** package is the fidelity keystone —
both `apps/storefront` (browser preview) and `apps/render-worker` (server production render)
import the same scene-building + rendering code, so preview and print cannot diverge. Medusa
owns commerce/admin; the render worker isolates heavy rendering from web requests. All code sits
under `apps/*` / `packages/*` (ASCII), never referencing the Cyrillic repo-root name.

## Complexity Tracking

> Only required when the Constitution Check has unjustified violations. None here — recorded for transparency.

| Decision | Why needed | Simpler alternative rejected because |
|----------|-----------|--------------------------------------|
| 4 deployable units (storefront, medusa, worker + Redis/Postgres/R2) | Principle VII isolation; async 300 DPI render must not block web requests; Principle II needs a shared render package | A single Next.js app rendering production files inline would block requests, risk browser-only fidelity gaps, and couple commerce to custom code |
| Medusa instead of custom commerce | Client-approved; delivers cart/orders/payments/promos/gift-cards/admin/CSV, focusing effort on the constructor | Hand-built commerce = large surface, more bugs, slower Stage 2 (promos/gift cards are native in Medusa) |

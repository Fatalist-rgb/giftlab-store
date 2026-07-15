# Implementation Plan: Personalized Figurine Storefront (Stage 1 MVP)

**Branch**: `001-personalized-figurine-store` | **Date**: 2026-07-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-personalized-figurine-store/spec.md`

## Summary

Stage 1 delivers a mobile-first storefront where a shopper personalizes one acrylic figurine
through a data-driven constructor and pays with card/BLIK/Przelewy24. The constructor renders
the live preview and the 300 DPI production file (with a separate CutContour cut line) from a
single shared **Design State** + rendering module, guaranteeing "what the customer saw is what
gets printed". Commerce (catalog, cart, orders, admin, CSV export) runs on **Medusa**; the
manufacturing render runs asynchronously via a **BullMQ/Redis** worker; photos and production
files live privately in **Cloudflare R2**. The storefront is trilingual (pl/en/uk) with
consent-gated analytics, base SEO, and RODO-compliant photo handling.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS (all apps).

**Primary Dependencies**: Next.js 15 (App Router) + React 18 + Tailwind + shadcn/ui
(storefront); Medusa v2 (commerce/admin) with `@medusajs/*`; `react-konva`/`konva` (editor) and
`@napi-rs/canvas` or `skia-canvas` (server render); `bullmq` + `ioredis` (queue); AWS SDK v3
S3 client for Cloudflare R2; `sharp` + `heic-convert` (image normalization/HEIC); `next-intl`
(i18n); `pdf-lib`/`pdfkit` (PDF with CutContour spot color).

**Storage**: PostgreSQL 16 (Medusa data + custom tables); Cloudflare R2 (private objects:
uploaded photos, production packages) with object versioning.

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
| I | Data-Driven Constructor | Product Schema (versioned JSON) drives editor, pricing, and render; no per-product code; `packages/constructor` is schema-generic | ✅ PASS |
| II | Production-File Fidelity | One `packages/constructor` render module used by preview (Konva/browser) and worker (server canvas); order stores Design State + schema-version snapshot; golden-image fidelity test | ✅ PASS |
| III | i18n by Architecture | `next-intl` catalogs (pl/en/uk), localized routing + hreflang; add/remove a locale = catalog + config only | ✅ PASS |
| IV | Mobile-First Performance | Constructor lazy-loaded (dynamic import); storefront SSR/edge; image optimization; CWV budget enforced in tests | ✅ PASS |
| V | Privacy & RODO (NON-NEGOTIABLE) | R2 private + signed URLs + encryption; explicit photo consent; retention job + deletion endpoint; consent-gated GTM | ✅ PASS |
| VI | Ownership & Maintainability | All infra on client accounts; typed + documented monorepo; Git from day 1 + staging; admin guide deliverable | ✅ PASS |
| VII | Modular, Testable Boundaries | Four bounded modules (storefront, medusa, render-worker, constructor pkg) with explicit contracts; critical-path tests | ✅ PASS |

**Result**: PASS (no violations). The multi-app monorepo is *mandated* by Principle VII, not a
complexity violation (see Complexity Tracking).

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
│   ├── src/features/constructor/   # lazy-loaded Konva editor (uses packages/constructor)
│   ├── src/features/checkout/  # cart + checkout (Medusa store API + payment)
│   ├── src/lib/                # medusa client, r2 upload, analytics/consent, seo
│   └── tests/                  # Playwright E2E
├── medusa/                     # Medusa v2 commerce backend + admin
│   ├── src/modules/            # custom: product-schema, design-state, render-orchestration
│   ├── src/api/                # custom routes (upload sign, price, render status, package, export)
│   ├── src/subscribers/        # order.placed -> enqueue render
│   └── src/admin/              # admin widgets (view design, download package)
└── render-worker/              # BullMQ consumer (Node)
    ├── src/                    # job processor -> packages/constructor server render -> R2
    └── tests/

packages/
├── constructor/                # SHARED: schema types, Design State, pricing, render core
│   ├── src/schema/             # Product Schema types + validation (zod)
│   ├── src/design-state/       # Design State types + (de)serialization + versioning
│   ├── src/render/             # scene builder (shared) + browser + server adapters
│   ├── src/pricing/            # deterministic price from schema + design state
│   └── tests/                  # unit + golden-image fidelity
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

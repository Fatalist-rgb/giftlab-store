# Tasks: Personalized Figurine Storefront (Stage 1 MVP)

**Input**: Design documents from `specs/001-personalized-figurine-store/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: INCLUDED — required by Constitution Principle VII and the plan (fidelity golden test,
E2E, contract tests).

**Organization**: by user story (P1 → P2 → P3). All code under ASCII `apps/*` and `packages/*`.

**Story legend**: US1 = Design & order a figurine (P1); US2 = Fulfill & manage orders (P2);
US3 = Reach, compliance & trust (P3).

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create pnpm monorepo skeleton (`pnpm-workspace.yaml`, root `package.json`, `apps/`, `packages/`) at repo root (ASCII paths only)
- [ ] T002 [P] Create `packages/config` — base `tsconfig.json`, ESLint + Prettier configs, and a zod `env` schema in `packages/config/src/env.ts`
- [ ] T003 [P] Add `.env.example` at repo root with DB, REDIS, R2 (keys/bucket/endpoint), payment (P24/Stripe test), GTM id, and `LOCALES=pl,en,uk`
- [ ] T004 [P] Add local infra `infra/docker-compose.yml` (postgres:16, redis:7) + `pnpm dev:infra` script
- [ ] T005 [P] Add CI skeleton `.github/workflows/ci.yml` (install, lint, typecheck, test) and root `turbo.json`

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ No user-story work starts until this phase is complete.** The `packages/constructor` module
is the fidelity keystone shared by storefront preview and the render worker.

- [ ] T006 [P] Define types `ProductSchema`, `DesignState`, `Scene` in `packages/constructor/src/schema/types.ts` and `packages/constructor/src/design-state/types.ts` (per contracts/constructor-schema.md)
- [ ] T007 [P] Implement zod validators `parseProductSchema` / `parseDesignState` (cross-check refs + zone bounds) in `packages/constructor/src/schema/validate.ts`
- [ ] T008 Implement deterministic `buildScene(schema, designState, assets)` in `packages/constructor/src/render/scene.ts` (no Date/random)
- [ ] T009 Implement `renderToCanvas` with browser + server adapters in `packages/constructor/src/render/{browser,server}.ts` (Konva; server uses `@napi-rs/canvas`)
- [ ] T010 [P] Implement `computePrice(schema, designState)` (minor units) in `packages/constructor/src/pricing/index.ts`
- [ ] T011 [P] Implement `buildCutContour(schema, scene)` → vector cut path in `packages/constructor/src/contour/index.ts`
- [ ] T012 [P] Unit tests (Vitest) for validators, `computePrice`, `buildScene` in `packages/constructor/tests/`
- [ ] T013 Scaffold Medusa v2 backend in `apps/medusa` (Postgres connection, migrations, admin) per plan.md
- [ ] T014 [P] Custom module `product-schema` (entity + service + migration) in `apps/medusa/src/modules/product-schema/`
- [ ] T015 [P] Custom module `design-state` (entity + service + migration) in `apps/medusa/src/modules/design-state/`
- [ ] T016 [P] Custom module `production-package` + Order extension (`render_status`, links) in `apps/medusa/src/modules/production-package/`
- [ ] T017 R2 storage helper (presigned PUT/GET, SSE) in `apps/medusa/src/lib/r2.ts`
- [ ] T018 [P] BullMQ queue + ioredis connection helper (`gl:render`) in `apps/medusa/src/lib/queue.ts`
- [ ] T019 Scaffold Next.js 15 storefront in `apps/storefront` (Tailwind, shadcn/ui, Medusa JS client) per plan.md
- [ ] T020 Configure `next-intl` `[locale]` routing (pl/en/uk) + hreflang + locale switch in `apps/storefront/src/app/[locale]/` and `apps/storefront/src/i18n/`
- [ ] T021 Scaffold `apps/render-worker` (BullMQ consumer skeleton, wire `packages/constructor` + `@napi-rs/canvas` + R2)

**Checkpoint**: Foundation ready — user stories can begin.

## Phase 3: User Story 1 - Design & order a figurine (Priority: P1) 🎯 MVP

**Goal**: A shopper personalizes the figurine, pays (card/BLIK/P24), and the order stores the
exact Design State and yields a 300 DPI production package with a CutContour.

**Independent Test**: On mobile, upload a photo → customize → checkout (BLIK test) → confirmation;
order stores DesignState; worker produces a package matching the preview.

### Tests for User Story 1 ⚠️ (write first, must fail before implementation)

- [ ] T022 [P] [US1] Contract tests for `/store/gl/products/:handle/schema`, `/uploads/sign`+`/finalize`, `/price`, `/cart/:id/line-items`, `/orders/:id/render-status` in `apps/medusa/tests/contract/store-gl.spec.ts`
- [ ] T023 [P] [US1] Golden-image fidelity test (browser vs server render of a fixed DesignState, pixel tolerance) in `packages/constructor/tests/golden.spec.ts`
- [ ] T024 [P] [US1] Playwright E2E design→cart→checkout(BLIK test)→confirmation in `apps/storefront/tests/e2e/design-order.spec.ts`

### Implementation for User Story 1

- [ ] T025 [US1] `GET /store/gl/products/:handle/schema` (published version) in `apps/medusa/src/api/store/gl/products/[handle]/schema/route.ts`
- [ ] T026 [US1] Photo `POST /uploads/sign` + `POST /uploads/:id/finalize` (presigned PUT, then `sharp`+`heic-convert` HEIC→raster, EXIF normalize, resolution gate) in `apps/medusa/src/api/store/gl/uploads/`
- [ ] T027 [US1] Authoritative `POST /store/gl/price` using `packages/constructor` `computePrice` in `apps/medusa/src/api/store/gl/price/route.ts`
- [ ] T028 [US1] `POST /store/gl/cart/:cartId/line-items` — validate DesignState, recompute price, persist DesignState, attach to Medusa line item, in `apps/medusa/src/api/store/gl/cart/`
- [ ] T029 [P] [US1] Product page + lazy-loaded Konva constructor (upload, move/scale/rotate, text, options, real-time preview) in `apps/storefront/src/features/constructor/`
- [ ] T030 [P] [US1] Live price display wired to `/store/gl/price` in `apps/storefront/src/features/constructor/PricePanel.tsx`
- [ ] T031 [US1] Cart + checkout UI via Medusa store API in `apps/storefront/src/features/checkout/`
- [ ] T032 [US1] Configure Medusa payment provider (Przelewy24; fallback Stripe `card`+`blik`+`p24`) in `apps/medusa/src/modules/payment/`
- [ ] T033 [US1] `order.placed` subscriber: freeze DesignState + snapshot schema version + enqueue `gl:render` in `apps/medusa/src/subscribers/order-placed.ts`
- [ ] T034 [US1] Render-worker processor: load design+schema+photos → `buildScene`→`renderToCanvas` 300 DPI PNG → `buildCutContour` SVG → PDF (CutContour spot) → `spec.json` + preview → upload R2 → create ProductionPackage + set status, in `apps/render-worker/src/processors/render.ts`
- [ ] T035 [US1] `GET /store/gl/orders/:id/render-status` in `apps/medusa/src/api/store/gl/orders/[id]/render-status/route.ts`
- [ ] T036 [US1] Order-confirmation email (Medusa notification module) in `apps/medusa/src/modules/notification/`
- [ ] T037 [US1] Seed script: one figurine product + published ProductSchema in `apps/medusa/src/scripts/seed-figurine.ts`

**Checkpoint**: US1 fully functional and demoable (MVP).

## Phase 4: User Story 2 - Fulfill & manage orders (Priority: P2)

**Goal**: Staff view an order's design, download its production package, edit prices/params, and
export orders.

**Independent Test**: Open any paid order in admin → see config → download package → change price
→ export CSV/XLSX.

### Tests for User Story 2 ⚠️

- [ ] T038 [P] [US2] Contract tests for `/admin/gl/orders/:id/package`, `PATCH /admin/gl/products/:id/schema`, `/admin/gl/orders/export` in `apps/medusa/tests/contract/admin-gl.spec.ts`
- [ ] T039 [P] [US2] Admin flow test: view design + download package in `apps/medusa/tests/integration/admin-package.spec.ts`

### Implementation for User Story 2

- [ ] T040 [US2] `GET /admin/gl/orders/:id/package` (short-lived signed R2 URLs; 409 if not ready) in `apps/medusa/src/api/admin/gl/orders/[id]/package/route.ts`
- [ ] T041 [US2] Admin widget: view DesignState + preview + download package in `apps/medusa/src/admin/widgets/order-design.tsx`
- [ ] T042 [US2] `PATCH /admin/gl/products/:id/schema` — publish new immutable ProductSchema version (prices/options/params) in `apps/medusa/src/api/admin/gl/products/[id]/schema/route.ts`
- [ ] T043 [US2] `GET /admin/gl/orders/export?format=csv|xlsx` (order + fulfillment + design summary) in `apps/medusa/src/api/admin/gl/orders/export/route.ts`

**Checkpoint**: US1 + US2 both work independently.

## Phase 5: User Story 3 - Reach, compliance & trust (Priority: P3)

**Goal**: Trilingual storefront, consent-gated analytics, base SEO, legal/content pages, and
RODO-compliant photo handling.

**Independent Test**: pl/en/uk switch + hreflang; zero analytics before consent; legal pages
localized + editable; checkout requires Terms/Privacy; photos private + deletable.

### Tests for User Story 3 ⚠️

- [ ] T044 [P] [US3] Playwright: consent gating (0 analytics calls pre-consent), locale switch + hreflang, legal pages, checkout Terms/Privacy gate in `apps/storefront/tests/e2e/compliance.spec.ts`

### Implementation for User Story 3

- [ ] T045 [P] [US3] Cookie-consent manager + GTM gated loader (GA4 + Meta Pixel via GTM, only post-consent) in `apps/storefront/src/lib/analytics/`
- [ ] T046 [P] [US3] SEO: per-page metadata, `sitemap.xml`, `robots.txt`, canonical + hreflang in `apps/storefront/src/app/[locale]/` + `apps/storefront/src/lib/seo.ts`
- [ ] T047 [P] [US3] `ContentPage` model + admin editing + localized rendering (regulamin/privacy/cookies/zwroty/dostawa/kontakt) in `apps/medusa/src/modules/content-page/` and `apps/storefront/src/app/[locale]/(content)/`
- [ ] T048 [US3] Footer with legal links + Contact page in `apps/storefront/src/components/Footer.tsx`
- [ ] T049 [US3] Checkout gate: require Terms accept + Privacy ack before payment (FR-027) in `apps/storefront/src/features/checkout/ConsentGate.tsx`
- [ ] T050 [P] [US3] RODO: photo retention job (auto-delete at `expires_at`) + deletion-request endpoint + private-access enforcement in `apps/medusa/src/jobs/photo-retention.ts` and `apps/medusa/src/api/store/gl/photos/`
- [ ] T051 [US3] Persist ConsentRecord (photo_processing + cookies) in `apps/medusa/src/modules/consent/`

**Checkpoint**: All user stories independently functional.

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T052 [P] Mobile CWV budget via Lighthouse CI on storefront + product page in `.github/workflows/ci.yml`
- [ ] T053 [P] Error model + structured logging (no PII) across apps in `packages/config/src/logger.ts`
- [ ] T054 [P] Docs: per-app README + admin guide "how to add a product & template" in `docs/`
- [ ] T055 Backups: managed Postgres daily + PITR + R2 versioning verification notes in `docs/ops.md`
- [ ] T056 [P] Fonts/assets licensing record + register print fonts in server renderer in `docs/licenses.md` + `packages/constructor/src/render/fonts.ts`
- [ ] T057 Staging environment (Vercel preview + staging Medusa/worker/DB) + deploy docs in `docs/deploy.md`
- [ ] T058 Run quickstart.md V1–V6 on staging; fix gaps

---

## Dependencies & Execution Order

- **Setup (P1..T005)** → no deps.
- **Foundational (T006–T021)** → depends on Setup; **blocks all user stories**. Within it:
  `packages/constructor` (T006–T012) blocks T034 (worker) and T029/T030 (preview); Medusa
  scaffold (T013) blocks T014–T018; storefront scaffold (T019) blocks T020, T029+.
- **US1 (T022–T037)** → after Foundational. MVP.
- **US2 (T038–T043)** → after Foundational; independent of US1 (uses stored data US1 produces).
- **US3 (T044–T051)** → after Foundational; independent of US1/US2.
- **Polish (T052–T058)** → after the targeted stories.

## Parallel Opportunities

- Setup: T002–T005 in parallel.
- Foundational: T006/T007/T010/T011 (constructor) parallel; T014/T015/T016/T018 (Medusa modules) parallel after T013.
- US1 tests T022/T023/T024 parallel (write first). T029/T030 parallel with backend T025–T028.
- Once Foundational is done, US1/US2/US3 can be staffed in parallel.

## Implementation Strategy

- **MVP first**: Setup → Foundational → US1 → validate (quickstart V1/V2) → demo.
- **Incremental**: add US2 (fulfillment) → demo; add US3 (compliance/i18n/legal) → demo.
- Each story ends at a checkpoint that is independently demoable and acceptance-gated (per
  constitution Development Workflow).

## Notes

- [P] = different files, no incomplete-task deps.
- Every US task carries its story label for traceability to spec.md.
- Tests for a story are written to fail before its implementation.
- Commit after each task or logical group; push to `001-personalized-figurine-store`.
- Fidelity (Principle II) is guarded by the golden-image test (T023) — treat a failure as a
  release blocker.

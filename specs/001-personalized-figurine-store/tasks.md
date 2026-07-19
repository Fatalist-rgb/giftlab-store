# Tasks: Personalized Figurine Storefront (Stage 1 MVP)

**Revised**: 2026-07-16 (rev 2 — character model + cutout in core, legal invariants, CRO findings)

**Input**: Design documents from `specs/001-personalized-figurine-store/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: INCLUDED — required by Constitution Principles VII/VIII (fidelity golden test, E2E,
contract tests, legal-computation unit tests).

**Organization**: by user story (P1 → P2 → P3). All code under ASCII `apps/*` and `packages/*`.

**Story legend**: US1 = Design & order a figurine (P1); US2 = Fulfil & manage orders (P2);
US3 = Trust, reach & compliance (P3).

> **Sequencing note.** Contract stages are commercial framing (constitution, Development Workflow).
> Background removal is in the **core** because the product cannot render a truthful preview without
> it. Nothing below is scheduled by stage label.

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create pnpm monorepo skeleton (`pnpm-workspace.yaml`, root `package.json`, `apps/`, `packages/`) at repo root (ASCII paths only)
- [x] T002 [P] Create `packages/config` — base `tsconfig.json`, ESLint + Prettier, zod `env` schema in `packages/config/src/env.ts`
- [x] T003 [P] Add `.env.example` at repo root: DB, REDIS, R2, payment (P24/Stripe test), cutout-provider key, GTM id, `LOCALES=pl,en,uk`
- [x] T004 [P] Add local infra `infra/docker-compose.yml` (postgres:16, redis:7) + `pnpm dev:infra`
- [x] T005 [P] Add CI skeleton `.github/workflows/ci.yml` (install, lint, typecheck, test) + root `turbo.json`

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ No user-story work starts until this phase is complete.** `packages/constructor` is the
fidelity + pricing + legal keystone shared by storefront and worker.

- [x] T006 [P] Define types `ProductSchema` (character layers/variants, faceZone, quantityLadder), `DesignState`, `Scene` in `packages/constructor/src/schema/types.ts` and `packages/constructor/src/design-state/types.ts` (per contracts/constructor-schema.md)
- [x] T007 [P] Implement zod `parseProductSchema` **including the free-default invariant** (reject non-zero default priceDelta) in `packages/constructor/src/schema/validate.ts`
- [x] T008 [P] Implement `parseDesignState` (cross-check refs, zone bounds, deferred-photo state) in `packages/constructor/src/design-state/validate.ts`
- [x] T009 Implement deterministic `buildScene(schema, designState, assets)` — composites character layers by zIndex + masked face + text; renders face placeholder when deferred — in `packages/constructor/src/render/scene.ts`
- [x] T010 Implement `renderToCanvas` browser + server adapters in `packages/constructor/src/render/{browser,server}.ts` (Konva; server on `@napi-rs/canvas`) + font registration in `packages/constructor/src/render/fonts.ts`
- [x] T011 [P] Implement `computePrice` incl. **quantity ladder** in `packages/constructor/src/pricing/index.ts`
- [x] T012 [P] Implement `computeWithdrawalRight(designState)` (pure, per line) in `packages/constructor/src/legal/withdrawal.ts`
- [x] T013 [P] Implement `assessPhoto` — returns **warning, never blocks** — in `packages/constructor/src/quality/index.ts`
- [x] T014 [P] Implement `buildCutContour(schema, scene)` → vector cut path in `packages/constructor/src/contour/index.ts`
- [x] T015 [P] Unit tests (Vitest) for validators (incl. free-default rejection), `computePrice` + ladder, `computeWithdrawalRight`, `assessPhoto` in `packages/constructor/tests/`
- [x] T016 [P] Create `packages/cutout` — provider-agnostic background-removal adapter interface + mock implementation + tests in `packages/cutout/src/`
- [ ] T017 Scaffold Medusa v2 backend in `apps/medusa` (Postgres, migrations, admin) per plan.md
- [ ] T018 [P] Custom module `product-schema` (entity + service + migration) in `apps/medusa/src/modules/product-schema/`
- [ ] T019 [P] Custom module `design-state` (entity + service + migration, incl. `photo_status`, `is_personalized`) in `apps/medusa/src/modules/design-state/`
- [ ] T020 [P] Custom module `production-package` + OrderLine extension (`render_status`, `withdrawal_right`, `withdrawal_notice_version`) in `apps/medusa/src/modules/production-package/`
- [ ] T021 [P] Custom module `price-history` (entity + snapshot on price change) in `apps/medusa/src/modules/price-history/`
- [ ] T022 R2 storage helper (presigned PUT/GET, SSE, artwork + photo + package buckets/prefixes) in `apps/medusa/src/lib/r2.ts`
- [ ] T023 [P] BullMQ queue + ioredis helper (`gl:render`, `gl:cutout`) in `apps/medusa/src/lib/queue.ts`
- [x] T024 Scaffold Next.js 15 storefront in `apps/storefront` (Tailwind, shadcn/ui, Medusa JS client) per plan.md
- [x] T025 Configure `next-intl` `[locale]` routing (pl/en/uk) + hreflang + locale switch in `apps/storefront/src/app/[locale]/` and `apps/storefront/src/i18n/`
- [ ] T026 Scaffold `apps/render-worker` (BullMQ consumer, wires `packages/constructor` + `@napi-rs/canvas` + R2)
- [ ] T027 Author placeholder character artwork set (body/skin/outfit variants + face mask) and upload to R2 in `apps/medusa/src/scripts/seed-artwork.ts`

**Checkpoint**: Foundation ready — user stories can begin.

## Phase 3: User Story 1 - Design & order a figurine (Priority: P1) 🎯 MVP

**Goal**: A shopper picks a character, uploads a face that is automatically cut out, personalizes,
pays (card/BLIK/P24), and the order yields a 300 DPI package with a CutContour.

**Independent Test**: On mobile — pick character → upload face → cutout appears → name + options →
pay by BLIK → confirmation; order stores DesignState; worker produces a package matching the preview.

### Tests for User Story 1 ⚠️ (write first, must fail before implementation)

- [ ] T028 [P] [US1] Contract tests for `/store/gl/products/:handle/schema`, `/uploads/sign|finalize|cutout`, `/price`, `/cart/:id/line-items`, `/delivery-estimate`, `/render-status` in `apps/medusa/tests/contract/store-gl.spec.ts`
- [ ] T029 [P] [US1] Golden-image fidelity test (browser vs server render of a fixed DesignState, pixel tolerance) in `packages/constructor/tests/golden.spec.ts`
- [ ] T030 [P] [US1] Playwright E2E: character → face upload → cutout → name → options → cart → checkout(BLIK test) → confirmation in `apps/storefront/tests/e2e/design-order.spec.ts`
- [ ] T031 [P] [US1] Test: **no paid option is pre-selected** and add-to-cart rejects a paid default, in `apps/medusa/tests/contract/free-defaults.spec.ts`

### Implementation for User Story 1

- [ ] T032 [US1] `GET /store/gl/products/:handle/schema` (published version + artwork URLs) in `apps/medusa/src/api/store/gl/products/[handle]/schema/route.ts`
- [ ] T033 [US1] `POST /uploads/sign` + `POST /uploads/:id/finalize` (presigned PUT; `sharp`+`heic-convert` HEIC→raster, EXIF normalize, strip metadata; returns `quality.warning`, never blocks) in `apps/medusa/src/api/store/gl/uploads/`
- [ ] T034 [US1] `POST/GET /uploads/:id/cutout` — enqueue `gl:cutout`, poll status, store `cutout_key` — in `apps/medusa/src/api/store/gl/uploads/[id]/cutout/route.ts`
- [ ] T035 [US1] Cutout job processor (calls `packages/cutout` adapter, retries, marks `failed` gracefully) in `apps/render-worker/src/processors/cutout.ts`
- [ ] T036 [US1] Authoritative `POST /store/gl/price` using `computePrice` + ladder in `apps/medusa/src/api/store/gl/price/route.ts`
- [ ] T037 [US1] `POST /store/gl/cart/:cartId/line-items` — validate designs, re-check free-default invariant, recompute price, persist DesignStates, attach to Medusa line items (supports multiple designs) in `apps/medusa/src/api/store/gl/cart/`
- [ ] T038 [US1] `GET /store/gl/delivery-estimate` — returns a **date window** with production folded in — in `apps/medusa/src/api/store/gl/delivery-estimate/route.ts`
- [ ] T039 [P] [US1] Product page shell + lazy-loaded constructor: character pickers (exposed **buttons**, not dropdowns), face upload with progress, live preview in `apps/storefront/src/features/constructor/`
- [ ] T040 [P] [US1] Cutout UX: honest progress, retry, swap photo, **"order now, send the photo later"** escape hatch in `apps/storefront/src/features/constructor/FaceUpload.tsx`
- [ ] T041 [P] [US1] **Clickable step tabs in one block** (Postać · Zdjęcie · Imię · Ilość) — any tab reachable, completed steps marked, «Wstecz/Dalej» nav, live preview stays visible outside the block; live price via the **quantity ladder** (every option free) in `apps/storefront/src/features/constructor/StepTabs.tsx`
- [ ] T042 [P] [US1] Quantity ladder UI — configure **several different designs** in one order in `apps/storefront/src/features/constructor/BulkLadder.tsx`
- [ ] T043 [US1] Mobile sticky buy element as a **drawer that completes add-to-cart in place** (never scroll-to-section) in `apps/storefront/src/features/constructor/StickyBuy.tsx`
- [ ] T044 [US1] Cart + checkout UI via Medusa store API, **guest checkout**, in `apps/storefront/src/features/checkout/`
- [ ] T045 [US1] Configure Medusa payment provider: card + **BLIK as a first-class choice** + Przelewy24 in `apps/medusa/src/modules/payment/`
- [ ] T046 [US1] InPost Paczkomat delivery option with **in-checkout locker picker** + courier + free-delivery threshold progress in `apps/storefront/src/features/checkout/Delivery.tsx`
- [ ] T047 [US1] `order.placed` subscriber: freeze DesignStates, snapshot schema version, **compute withdrawal right per line**, record notice version, store promised delivery window, enqueue `gl:render` in `apps/medusa/src/subscribers/order-placed.ts`
- [ ] T048 [US1] Render processor: load design+schema+artwork+cutout → `buildScene`→`renderToCanvas` 300 DPI PNG → `buildCutContour` SVG → PDF (CutContour spot) → `spec.json` + preview → R2 → ProductionPackage + status; `awaiting_photo` when deferred, in `apps/render-worker/src/processors/render.ts`
- [ ] T049 [US1] `GET /store/gl/orders/:orderId/lines/:lineId/render-status` + `POST .../photo` (attach deferred photo) in `apps/medusa/src/api/store/gl/orders/`
- [ ] T050 [US1] Order-confirmation email (Medusa notification) in `apps/medusa/src/modules/notification/`
- [ ] T051 [US1] Seed script: figurine product + published ProductSchema (character variants, ladder, contour) in `apps/medusa/src/scripts/seed-figurine.ts`

**Checkpoint**: US1 fully functional and demoable (MVP).

## Phase 4: User Story 2 - Fulfil & manage orders (Priority: P2)

**Goal**: Staff see the design, download the package, fix prices/options, export, and are alerted
to problems.

**Independent Test**: Open a paid order → see config → download package → change a price → export.

### Tests for User Story 2 ⚠️

- [ ] T052 [P] [US2] Contract tests for `/admin/gl/orders/:id/lines/:lineId/package`, `/admin/gl/orders/flagged`, `PATCH /admin/gl/products/:id/schema`, `/admin/gl/orders/export` in `apps/medusa/tests/contract/admin-gl.spec.ts`
- [ ] T053 [P] [US2] Test: publishing a schema with a paid default is rejected (422) in `apps/medusa/tests/contract/schema-publish.spec.ts`

### Implementation for User Story 2

- [ ] T054 [US2] `GET /admin/gl/orders/:orderId/lines/:lineId/package` (signed R2 URLs; 409 if not ready) in `apps/medusa/src/api/admin/gl/orders/[orderId]/lines/[lineId]/package/route.ts`
- [ ] T055 [US2] Admin widget: view DesignState + preview + download package + withdrawal flag in `apps/medusa/src/admin/widgets/order-design.tsx`
- [ ] T056 [US2] `GET /admin/gl/orders/flagged` + admin surface for `render_failed` / `awaiting_photo` in `apps/medusa/src/api/admin/gl/orders/flagged/route.ts`
- [ ] T057 [US2] `PATCH /admin/gl/products/:id/schema` — publish new immutable version, reject paid defaults, snapshot price to PriceHistory, in `apps/medusa/src/api/admin/gl/products/[id]/schema/route.ts`
- [ ] T058 [US2] `GET /admin/gl/orders/export?format=csv|xlsx` (order + fulfilment + design summary + withdrawal flag) in `apps/medusa/src/api/admin/gl/orders/export/route.ts`

**Checkpoint**: US1 + US2 both work independently.

## Phase 5: User Story 3 - Trust, reach & compliance (Priority: P3)

**Goal**: Trilingual store, consent-gated analytics, honest delivery dates, lawful returns
position paired with a real guarantee, private photos.

**Independent Test**: pl/en/uk + hreflang; zero analytics pre-consent; withdrawal notice at
payment; legal pages localized + editable; photos private + deletable.

### Tests for User Story 3 ⚠️

- [ ] T059 [P] [US3] Playwright: consent gating (0 analytics calls pre-consent), locale switch + hreflang, legal pages, withdrawal notice visible at payment, **and no counter/timer resets on reload** (Principle VIII), in `apps/storefront/tests/e2e/compliance.spec.ts`
- [ ] T060 [P] [US3] Test: a line with only standard options **retains** the 14-day right; a personalized line is `excluded` in `apps/medusa/tests/contract/withdrawal.spec.ts`

### Implementation for User Story 3

- [ ] T061 [P] [US3] Cookie-consent manager + GTM gated loader (GA4 + Meta Pixel only post-consent; basis art. 399 PKE) in `apps/storefront/src/lib/analytics/`
- [ ] T062 [P] [US3] SEO: per-page metadata, `sitemap.xml`, `robots.txt`, canonical + hreflang in `apps/storefront/src/lib/seo.ts`
- [ ] T063 [P] [US3] `ContentPage` module + admin editing + localized rendering (regulamin/privacy/cookies/zwroty/dostawa/kontakt) — **no ODR link** — in `apps/medusa/src/modules/content-page/` and `apps/storefront/src/app/[locale]/(content)/`
- [ ] T064 [US3] `GET /store/gl/legal/withdrawal-notice` + checkout block rendering the notice **beside the pay button**, paired with the guarantee in `apps/storefront/src/features/checkout/WithdrawalNotice.tsx`
- [ ] T065 [US3] Guarantee presentation (design approval before production; remake/refund; no return shipping) on PDP + checkout in `apps/storefront/src/components/Guarantee.tsx`
- [ ] T066 [P] [US3] `Review` module + PDP reviews with **verified-buyer marking** + verification-method disclosure + summary distribution in `apps/medusa/src/modules/review/` and `apps/storefront/src/features/reviews/`
- [ ] T067 [P] [US3] RODO: 60-day photo retention job + deletion-request endpoint + private-access enforcement in `apps/medusa/src/jobs/photo-retention.ts` and `apps/medusa/src/api/store/gl/photos/`
- [ ] T068 [US3] Persist ConsentRecord (photo_processing + cookies) in `apps/medusa/src/modules/consent/`
- [ ] T069 [US3] Seller identity block (company, PL address, NIP, contact) in footer + Kontakt in `apps/storefront/src/components/Footer.tsx`
- [ ] T070 [P] [US3] Upload-free **ad entry pages** (`(ads)` route group) — constructor opens on explicit action — in `apps/storefront/src/app/[locale]/(ads)/`
- [ ] T071 [P] [US3] RUM (`web-vitals`) reporting segmented by UA/referrer + **filter ad-platform preload bots** from analytics in `apps/storefront/src/lib/rum.ts`
- [ ] T071a [US3] **Constructor funnel instrumentation** (SC-004): consent-gated events for each step — open → character chosen → face uploaded → cutout ready/failed/deferred → name → options → add-to-cart — each carrying the step id, so abandonment is attributable to a specific step, in `apps/storefront/src/features/constructor/telemetry.ts`
- [ ] T071b [US3] Constructor completion-rate report (starts vs add-to-cart, drop-off per step) surfaced in the admin in `apps/medusa/src/admin/widgets/constructor-funnel.tsx`

**Checkpoint**: All user stories independently functional.

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T072 [P] Mobile CWV budget via Lighthouse CI on storefront + product page in `.github/workflows/ci.yml`
- [ ] T073 [P] Error model + structured logging (no PII) across apps in `packages/config/src/logger.ts`
- [ ] T074 [P] Docs: per-app README + admin guide "how to add a product & template" in `docs/`
- [ ] T075 Backups: managed Postgres daily + PITR + R2 versioning verification notes in `docs/ops.md`
- [ ] T076 [P] Fonts/artwork licensing record in `docs/licenses.md`
- [ ] T077 Staging environment (Vercel preview + staging Medusa/worker/DB on Railway) + deploy docs in `docs/deploy.md`
- [ ] T078 Verify the constructor works inside real FB/IG/TikTok in-app browsers on physical devices; record findings in `docs/inapp-browser-qa.md`
- [ ] T079 Run quickstart.md validation scenarios on staging; fix gaps

---

## Dependencies & Execution Order

- **Setup (T001–T005)** → no deps.
- **Foundational (T006–T027)** → depends on Setup; **blocks all user stories**. Within it:
  `packages/constructor` (T006–T015) blocks T039/T048; `packages/cutout` (T016) blocks T035;
  Medusa scaffold (T017) blocks T018–T023; storefront scaffold (T024) blocks T025, T039+;
  artwork (T027) blocks preview work.
- **US1 (T028–T051)** → after Foundational. MVP.
- **US2 (T052–T058)** → after Foundational; independent of US1 (consumes data US1 produces).
- **US3 (T059–T071)** → after Foundational; independent of US1/US2.
- **Polish (T072–T079)** → after the targeted stories.

## Parallel Opportunities

- Setup: T002–T005 in parallel.
- Foundational: T006–T008, T011–T016 parallel; T018–T023 parallel after T017.
- US1: tests T028–T031 parallel (write first); frontend T039–T043 parallel with backend T032–T038.
- Once Foundational is done, US1/US2/US3 can be staffed in parallel.

## Implementation Strategy

- **MVP first**: Setup → Foundational → US1 → validate (quickstart V1/V2) → demo.
- **Incremental**: add US2 (fulfilment) → demo; add US3 (trust/compliance/i18n) → demo.
- Each story ends at a checkpoint that is independently demoable and acceptance-gated.

## Notes

- [P] = different files, no incomplete-task deps.
- Tests for a story are written to fail before its implementation.
- Commit after each task or logical group; push to `001-personalized-figurine-store`.
- **Release blockers:** the golden-image fidelity test (T029), the free-default test (T031), and
  the withdrawal-right test (T060). A failure in any of these is a legal or product-integrity
  defect, not a bug to triage later.
- **Why the funnel tasks (T071a/T071b) are not "analytics polish":** the constructor *is* the
  customer's effort, and effort only creates the willingness-to-pay this pricing rests on when it
  completes. An abandoned upload doesn't merely fail to convert — it erases the premium. Measuring
  where sessions die is therefore product work, not reporting.

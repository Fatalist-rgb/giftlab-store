# Phase 0 Research: Personalized Figurine Storefront (Stage 1)

Decisions that resolve the Technical Context. Format per decision: **Decision / Rationale /
Alternatives considered**.

> **Rev 2 addendum (2026-07-16).** Field research into the reference product, 12 comparable stores,
> Polish primary market data, and statute text produced decisions §12–§16 below and amended §2/§6.
> Full evidence: `research/findings-consolidated.md` (repo-external, in the design workspace).

## 12. Product model — catalogue character + customer's face

**Decision**: The figurine body is **catalogue artwork** the customer selects (body type, skin tone,
outfit); the customer supplies **only a face photo**, whose background is removed automatically.

**Rationale**: This is how the reference product actually works, and it is the only model in which a
live preview can be honest — the render is fully determined by artwork the system owns plus a
background-free cutout. Of 12 comparable stores, the one that offers live preview does so exactly
this way; the ones that accept an arbitrary photo show **no preview at all** and composite by hand
after the order.

**Alternatives**: Customer's whole photo inside a silhouette (rejected: the preview would lie
whenever the background is busy, and the print would carry the customer's kitchen); no preview,
manual compositing (rejected: kills the constructor's value and adds per-order labour).

**Consequence**: background removal moves from "later stage" into the **core** (constitution,
Development Workflow).

## 13. Background removal — hosted service behind our adapter

**Decision**: Call a hosted cutout/segmentation API through `packages/cutout`, a provider-agnostic
adapter with a mock implementation for tests. Run it as a queued job with honest progress in the UI,
retries, and a graceful failure path (order now, photo later).

**Rationale**: Segmentation quality is a vendor's core competence and improves without our work;
an adapter keeps the provider swappable and the constructor testable offline. The reference product
labels this "ready in 5–15 sec" — the latency is expected and can be shown honestly rather than hidden.

**Alternatives**: In-house model (rejected: cost/quality, no differentiation); client-side WASM
segmentation (rejected: mobile CPU + inconsistent quality on the exact devices our traffic uses);
no removal (rejected: product does not function).

## 14. Photo quality — warn, never block

**Decision**: Assess resolution against the print size and **warn with a remedy**; never block
checkout.

**Rationale**: None of the 12 stores blocks on resolution. A block fires at peak purchase intent
with no path forward. It also destroys the effort premium the product's pricing rests on: the
configurator *is* the customer's labour, and labour that fails to complete yields no valuation
uplift at all.

**Alternatives**: Hard block (the original spec's FR-002 — rejected); silent acceptance (rejected:
print complaints).

## 15. Cash on delivery — not at launch

**Decision**: Offer card, BLIK, and Przelewy24. **No COD initially**; keep the architecture able to
add it.

**Rationale**: Polish data shows COD is used as a primary method by only ~4% of shoppers, yet its
*availability* is named as a credibility factor by ~24% — it is a trust signal more than a payment
rail. For made-to-order goods the risk is asymmetric: a refused parcel leaves an item nobody else
can buy. The credibility gap is cheaper to close with reviews and a named guarantee.

**Alternatives**: COD from day one (rejected: dead stock risk); COD above a threshold (kept as a
later option if the client accepts the risk).

## 16. Ad-traffic entry — no upload on the preloaded page

**Decision**: Paid-social traffic lands on an **upload-free entry page**; the constructor opens on
an explicit user action. Ad-platform preload bots are excluded from analytics.

**Rationale**: TikTok preloads in-feed landing pages by default and its own documentation advises
against preloading pages that include file upload — which is precisely our product page. Separately,
Meta scores landing-page bounce rate and dwell time as ad-quality signals and attaches that
reputation to the **domain**, so preload traffic counted as visits would degrade delivery cost.

**Alternatives**: Send ads straight to the constructor (rejected: fights the platform's own
guidance); request preload opt-out (kept as a fallback, requires the platform rep).

## Amendments to earlier decisions

- **§2 (render engine)** — unchanged in mechanism, strengthened in premise: the shared scene is now
  *guaranteed* deterministic because the body is artwork we own and the face arrives pre-cut.
- **§6 (payments)** — BLIK is not "one of three methods": it is the primary method for ~56% of
  Polish shoppers and must be a first-class choice, never nested inside an aggregator. InPost
  Paczkomat with in-checkout locker selection is effectively mandatory (~83% prefer lockers, ~87% of
  those choose InPost).
- **§10 (hosting)** — resolved: **Railway**, account owned by the client.

## 1. Commerce platform — Medusa v2

**Decision**: Use Medusa v2 for catalog, cart, orders, payments, and admin; extend it with
custom modules for Product Schema, Design State, and render orchestration.

**Rationale**: Client-approved. Provides cart/checkout, order lifecycle, pricing, promotions and
gift cards (Stage 2), an admin dashboard, and CSV export out of the box — so custom effort
concentrates on the constructor and render pipeline. TypeScript + self-hostable → fully
transferable to the client.

**Alternatives**: Custom commerce (rejected: huge surface, slower Stage 2); Saleor (Python —
off-stack); Vendure (viable, but Medusa is the client's explicit choice and has first-class
Next.js starters); Shopify (SaaS, not transferable as source, weak deep customization).

## 2. Preview↔production render engine (fidelity keystone)

**Decision**: One shared scene model in `packages/constructor`. The browser preview renders it
with `react-konva`; the worker renders the identical scene with **Konva on `@napi-rs/canvas`**
(node canvas) at 300 DPI. Fonts, layout math, and transforms live in shared code; only the
canvas backend differs.

**Rationale**: Principle II — identical scene + identical layout code means preview and print
cannot diverge. Konva runs in Node against a canvas backend, so the same drawing calls produce
the print bitmap. `@napi-rs/canvas` is fast, prebuilt (no node-gyp pain on the host), and
supports custom font registration for deterministic text.

**Alternatives**: Client-side export (rejected: browser memory limits at 300 DPI, font/asset
race conditions, device-dependent output); headless Chromium/Puppeteer render (heavier, slower,
harder to pin fonts, more infra); `skia-canvas` (viable backend alternative — keep as fallback);
pure SVG→raster (photo manipulation is clunky in SVG).

## 3. Production file formats + CutContour

**Decision**: Emit three artifacts per order: **PNG** (flattened 300 DPI raster), **PDF** (300
DPI raster artwork + a vector **CutContour** path on a named spot color), and **SVG** (vector
cut path + placed raster). CutContour geometry is derived from the schema's contour definition
(offset around the figure silhouette).

**Rationale**: Print/cut vendors expect a spot color literally named `CutContour` for the cutter
to recognize the cut line; PDF via `pdf-lib`/`pdfkit` supports separation/spot colors. PNG is the
universal fallback; SVG carries clean vector cut geometry.

**Alternatives**: Single PNG only (rejected: no machine cut path); rasterized cut line (rejected:
cutters need vector); baking the cut line into artwork (rejected: not separable for the cutter).

**Open item for production**: confirm the print partner's exact CutContour spot name and bleed/
offset with the client before go-live (captured as a plan-time assumption, not a code blocker).

## 4. Async render queue — BullMQ + Redis

**Decision**: `order.placed` (Medusa subscriber) enqueues a BullMQ job `{orderId,
designStateId, schemaVersion}`; the `render-worker` consumes it, renders the package, uploads to
R2, and writes back status + keys. Retries with backoff; dead-letter + admin alert on final
failure.

**Rationale**: Keeps 300 DPI rendering off the web request path (Principle IV), absorbs paid-
social spikes, and gives retries/observability. BullMQ is the standard Node/Redis queue.

**Alternatives**: Synchronous render in the API (rejected: blocks requests, no retries); cloud
functions (rejected: cold starts + fonts/canvas packaging friction + less portable).

## 5. Object storage — Cloudflare R2

**Decision**: Private R2 buckets (S3 API) for uploaded photos and production packages. Uploads
via short-lived presigned PUT URLs from the storefront; downloads via short-lived presigned GET
(admin + emails). Object versioning on; server-side encryption at rest.

**Rationale**: Principle V — private by default, signed time-limited access, encryption; R2 has
no egress fees (cost) and is S3-compatible (portable). Presigned uploads keep large files off
the app servers.

**Alternatives**: AWS S3 (works; R2 chosen for zero egress + cost); Supabase Storage (dropped
with the Supabase-less stack); public bucket (rejected: violates Principle V).

## 6. Payments on Medusa (cards + BLIK + Przelewy24)

**Decision**: Ship with **Przelewy24 (P24)** as the gateway covering cards + BLIK + P24 bank
transfers, integrated as a Medusa payment provider. If a maintained P24 provider for Medusa v2 is
not production-ready, fall back to **Stripe** (Payment Element with `p24` + `blik` + `card`
methods) — both satisfy the required methods; final choice confirmed at implementation start.

**Rationale**: The client named Przelewy24 and it is the Polish market standard (native BLIK +
banks). Stripe is a low-risk fallback that natively offers `p24` and `blik` payment methods. The
Medusa payment-provider abstraction lets us swap without touching checkout UI.

**Alternatives**: PayU / Tpay / Autopay (viable PL gateways, not requested); cards-only
(rejected: BLIK + P24 are required). Merchant account MUST be the client's company.

## 7. Image intake — HEIC / EXIF / resolution

**Decision**: On upload, normalize server-side with `sharp`: convert HEIC→JPEG/PNG (via
`heic-convert`/libheif), apply EXIF orientation then strip metadata, and **flag** anything below the
recommended print resolution (derived from the print size at 300 DPI) as a warning — never a block
(see §14). Store the normalized master privately; generate a downscaled web preview.

**Rationale**: iPhone photos are HEIC and EXIF-rotated; normalizing once guarantees the editor
and the print use the same upright, correctly-sized image. Metadata stripping reduces PII (RODO).

**Alternatives**: Client-side HEIC decode (inconsistent browser support); no resolution gate
(rejected: FR-002 + quality complaints).

## 8. i18n — next-intl (pl/en/uk)

**Decision**: `next-intl` with locale-segmented routes `/[locale]/...`, message catalogs per
locale, `hreflang` alternates, and a locale switcher. `pl` default; `uk` flagged temporary via
config so it can be dropped without code changes.

**Rationale**: Principle III — language is configuration. next-intl integrates with the App
Router and SSR/SSG for SEO.

**Alternatives**: next-i18next (Pages-router oriented); hand-rolled (reinvents routing/hreflang).

## 9. Consent + analytics gating

**Decision**: A cookie-consent manager (e.g., Klaro/Cookiebot-class, self-hosted preferred)
sets consent categories; **GTM loads only after consent**, and GA4 + Meta Pixel fire through
GTM. No tag network calls before acceptance. (Meta Conversions API is Stage 3.)

**Rationale**: Principle V + FR-020; gating at the GTM loader is the cleanest single control
point and is auditable (SC-004 = zero calls before consent).

**Alternatives**: Loading tags then "consent mode" only (rejected: still emits calls before
acceptance).

## 10. Hosting topology + backups/PITR

**Decision**: Storefront → **Vercel**. Medusa + render-worker + **Redis** + **PostgreSQL** →
a Node-friendly host on the client's accounts (Railway or Render for managed simplicity; a VPS
if the client prefers one server). Managed Postgres with **daily backups + point-in-time
recovery**; R2 object versioning covers files.

**Rationale**: Principle VI — everything on the client's accounts, transferable. Vercel is ideal
for the Next.js storefront; Medusa/worker need a persistent Node host (not serverless). Managed
Postgres gives PITR without hand-rolled backup ops.

**Alternatives**: All-in-one VPS (more ops burden, still valid if client wants it); serverless
Medusa (unsupported pattern).

**Confirm with client**: preferred host (Railway/Render vs own VPS) + domain/DNS ownership.

## 11. Fonts & assets licensing

**Decision**: Use only fonts/icons/graphics with commercial-use licenses (Google Fonts OFL or
purchased); record licenses in the repo. Register the exact print fonts in the server renderer so
preview and print use identical glyphs.

**Rationale**: Contract requires commercial licensing and full transfer; identical font
registration protects Principle II fidelity.

**Alternatives**: System fonts (rejected: non-deterministic across preview/print + weak brand).

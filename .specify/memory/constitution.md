<!--
SYNC IMPACT REPORT
Version: 1.0.0 → 1.1.0  (MINOR — new principle + materially expanded guidance)
Ratified: 2026-07-16 | Last Amended: 2026-07-16
Change driver: research into the reference product + 12 comparable stores + PL primary market data
and statute text (see specs/001-personalized-figurine-store/../research/findings-consolidated.md).

Added:
  VIII. Lawful Commerce by Design (NON-NEGOTIABLE) — paid defaults, per-line withdrawal right +
        notice provability, price history, no manufactured urgency, consent before tracking.
Modified:
  VII.  Modular, Testable Boundaries — added background-removal adapter as a bounded module;
        withdrawal-right computation added to critical paths requiring tests.
  Technology & Architecture Constraints — added background-removal service; BLIK first-class;
        no COD while catalogue is made-to-order; InPost locker selection; RUM (third-party field
        data excludes in-app browsers); cookie basis art. 399 PKE.
  Development Workflow & Quality Gates — staged delivery reframed as commercial framing, not
        technical sequencing; background removal moved into the Core because the product cannot
        function without it (body is catalogue artwork + customer's face).
Removed: none. Principles I–VI unchanged.

Templates reviewed:
  ✅ .specify/templates/plan-template.md  — Constitution Check gate is generic; compatible
  ✅ .specify/templates/spec-template.md  — compatible
  ✅ .specify/templates/tasks-template.md — compatible
Downstream artifacts updated in the same revision: spec.md (rev 2), data-model.md (rev 2),
plan.md, contracts/, tasks.md.
Deferred TODOs: none
-->

# GiftLab Constitution

Personalized-gifts e-commerce platform with a universal online constructor. Stage 1 MVP: one product (acrylic belly figurine). Working brand name "GiftLab" is a placeholder.

## Core Principles

### I. Data-Driven Constructor (Universal Engine)

The constructor MUST be driven by a versioned **Product Schema** (JSON) that declares photo
zones, text fields, option/color/accessory selectors, constraints, pricing rules, and the
cut-contour layer. Product-specific behavior MUST NOT be hardcoded in the engine. Adding a
new product MUST be achievable by authoring a new schema/template — never by editing engine
internals.

**Rationale:** the business grows by adding personalized products; a one-product hardcode
breaks the core value proposition and the client's scalability requirement.

### II. Production-File Fidelity (WYSIWYG-to-Print)

The customer preview and the manufacturing file MUST be produced from the **same Design State**
and the **same rendering code**. Production output MUST be 300 DPI, expose PNG/PDF/SVG, and
include a separate **CutContour** layer. Each order MUST persist its Design State plus a
snapshot of the Product Schema version used to build it.

**Rationale:** "the print equals what the customer saw" is a hard requirement; divergent
preview/production code paths are the primary source of manufacturing defects.

### III. Internationalization by Architecture

All user-facing text MUST come from locale catalogs (next-intl); no hardcoded strings.
Stage 1 ships **pl** (primary), **en**, and **uk** (temporary). Adding or removing a locale
MUST require only catalog + config changes, with correct `hreflang` and localized routing.

**Rationale:** the platform targets multiple markets; language is a configuration concern,
not a code concern.

### IV. Mobile-First Performance

Storefront and product pages MUST target green Core Web Vitals on mobile. The constructor
MUST be lazy-loaded and MUST NOT block first paint of the storefront. Images MUST be
optimized and served responsively.

**Rationale:** primary traffic is paid social (FB/IG/TikTok) on mobile; speed drives conversion.

### V. Privacy & RODO/GDPR Compliance (NON-NEGOTIABLE)

Customer photos MUST be stored privately with time-limited signed URLs and encryption at
rest. The system MUST capture explicit consent for photo processing, enforce a defined
retention period, and support technical deletion of personal data. Analytics and marketing
tags MUST NOT load before cookie consent.

**Rationale:** the product processes personal photos in the EU; compliance is a legal
obligation, not an optional feature.

### VI. Ownership & Maintainability

All infrastructure MUST be deployable on accounts owned by the client. Code MUST be clean,
documented, and typed. Every change MUST go through Git from day one, with a staging
environment. Deliverables MUST include technical documentation and an administrator guide
("how to add a product and a template").

**Rationale:** the contract transfers full ownership; the client must operate and extend the
platform independently.

### VII. Modular, Testable Boundaries

The system MUST be decomposed into independently testable modules: **storefront**,
**commerce (Medusa)**, **constructor engine** (`packages/constructor`), **background-removal
service adapter**, and **render worker**. Modules MUST communicate through well-defined interfaces
and be understandable in isolation. Critical paths — schema→preview→production-file fidelity,
pricing, checkout, payment, and withdrawal-right computation — MUST have automated tests.

**Rationale:** isolation keeps the custom constructor decoupled from the commerce platform
and makes the fidelity guarantee verifiable.

### VIII. Lawful Commerce by Design (NON-NEGOTIABLE)

Polish consumer law is a build constraint, not a launch checklist. The following are structural
and MUST be enforced in code, not by editorial discipline:

- **No paid defaults.** A pre-selected option that increases the price is refundable on demand;
  default selections MUST be free.
- **Withdrawal right is computed per order line**, from actual personalization, and the exact
  notice shown MUST be recorded — the seller carries the burden of proving the customer was
  informed before being bound. The store informs about a statutory exclusion; it never purports to
  create one.
- **Price transparency.** Price history MUST exist from day one, so that any reduction ever shown —
  on-site or in advertising — can display the preceding 30-day low beside it.
- **No manufactured urgency.** Countdown timers that reset per session or per visit are prohibited;
  only genuine, shared, calendar-anchored deadlines. A displayed delivery date is a promise and
  MUST be met.
- **Consent before tracking**, on the current legal basis.

**Rationale:** every item here has a documented enforcement precedent or a direct statutory hook,
and each is cheap to build in and expensive to retrofit. Protecting the client from fines is part
of delivering the platform, not an optional extra.

## Technology & Architecture Constraints

- **Stack (client-approved):** Next.js (App Router) + TypeScript storefront; **Medusa**
  (commerce, admin, orders, pricing, promotions, gift cards) on Node + **PostgreSQL**;
  **Redis + BullMQ** for the render queue; **Cloudflare R2** (S3-compatible) for private photo
  and production-file storage with versioning; **Konva** for constructor/preview and
  server-side rendering; **next-intl** for i18n.
- **Background removal:** a hosted cutout/segmentation service invoked from the constructor, with
  honest progress feedback and a graceful path when it fails (order now, photo later).
- **Payments:** cards + BLIK + Przelewy24; the merchant account MUST be owned by the client. BLIK
  MUST be a first-class choice. Cash on delivery is not offered while the catalogue is
  made-to-order.
- **Delivery:** InPost Paczkomat with in-checkout locker selection, plus courier.
- **Analytics:** GA4 + GTM + Meta Pixel, consent-gated (basis: art. 399 PKE); real-user monitoring
  from actual visitors, since third-party field datasets exclude in-app browsers. Meta Conversions
  API planned.
- **Repository:** monorepo — `apps/storefront`, `apps/medusa`, `apps/render-worker`,
  `packages/constructor`, `packages/config`. Application code MUST live under ASCII paths.
- **Resilience:** daily PostgreSQL backups with point-in-time recovery; file versioning in R2.
- Any deviation from this stack MUST be approved by the client before implementation.

## Development Workflow & Quality Gates

- **Staged delivery is commercial framing, not architecture.** The stages in the contract exist so
  the client can follow progress and accept work incrementally; they MUST NOT dictate technical
  sequencing. The system is designed as one coherent whole, and a capability is built when the
  product needs it to function — not when its stage label arrives. Each stage still ends with a
  working demo and client acceptance before it is considered done.
  - **Core (must work for the product to exist):** one product, the full constructor
    (character selection + face upload + **automatic background removal** + live preview), cart,
    checkout, payment, production file, admin, pl/en/uk, analytics, email, responsive, base SEO.
    *Background removal sits in the core because the figurine is catalogue artwork plus the
    customer's face: without it the customer's background reaches the print and the preview lies.*
  - **Later:** visual no-code template editor, promo codes / gift certificates / active
    discounting, extended statistics.
  - **Later still:** further AI (character generation, photo enhancement), ERP/CRM, carrier
    integrations beyond checkout delivery choice.
- **Git-based.** Feature branches; staging environment; changes reviewed before merge.
- **Quality gates (per stage):** green mobile CWV on storefront/product; production-file
  fidelity verified against preview; automated tests for critical paths; responsive +
  accessibility checks; RODO review (Principle V) before acceptance.
- **Reporting.** Short progress report 1–2× per week.

## Governance

This constitution supersedes ad-hoc practices. Amendments MUST be documented with rationale
and a version bump. Architecture or stack changes MUST be approved by the client before
implementation. Compliance is reviewed before each stage acceptance, with particular attention
to Principle V (Privacy & RODO). Versioning follows semantic rules: MAJOR for removals or
incompatible redefinitions, MINOR for new/expanded principles or sections, PATCH for
clarifications. Runtime development guidance lives in the feature specs under `specs/`.

**Version**: 1.1.0 | **Ratified**: 2026-07-16 | **Last Amended**: 2026-07-16

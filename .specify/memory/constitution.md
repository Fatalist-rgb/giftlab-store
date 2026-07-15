<!--
SYNC IMPACT REPORT
Version: (unversioned template) → 1.0.0
Ratified: 2026-07-16 | Last Amended: 2026-07-16
Change type: Initial ratification (template placeholders → concrete principles)
Principles defined:
  I.   Data-Driven Constructor (Universal Engine)
  II.  Production-File Fidelity (WYSIWYG-to-Print)
  III. Internationalization by Architecture
  IV.  Mobile-First Performance
  V.   Privacy & RODO/GDPR Compliance (NON-NEGOTIABLE)
  VI.  Ownership & Maintainability
  VII. Modular, Testable Boundaries
Added sections: Technology & Architecture Constraints; Development Workflow & Quality Gates
Removed sections: none
Templates reviewed:
  ✅ .specify/templates/plan-template.md  — Constitution Check gate is generic; compatible
  ✅ .specify/templates/spec-template.md  — scope/requirements/entities sections compatible
  ✅ .specify/templates/tasks-template.md — task categories cover testing/versioning/privacy
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
**commerce (Medusa)**, **constructor engine** (`packages/constructor`), and **render worker**.
Modules MUST communicate through well-defined interfaces and be understandable in isolation.
Critical paths — schema→preview→production-file fidelity, pricing, checkout, payment — MUST
have automated tests.

**Rationale:** isolation keeps the custom constructor decoupled from the commerce platform
and makes the fidelity guarantee verifiable.

## Technology & Architecture Constraints

- **Stack (client-approved):** Next.js (App Router) + TypeScript storefront; **Medusa**
  (commerce, admin, orders, pricing, promotions, gift cards) on Node + **PostgreSQL**;
  **Redis + BullMQ** for the render queue; **Cloudflare R2** (S3-compatible) for private photo
  and production-file storage with versioning; **Konva** for constructor/preview and
  server-side rendering; **next-intl** for i18n.
- **Payments:** cards + BLIK + Przelewy24; the merchant account MUST be owned by the client.
- **Analytics:** GA4 + GTM + Meta Pixel, consent-gated; Meta Conversions API planned.
- **Repository:** monorepo — `apps/storefront`, `apps/medusa`, `apps/render-worker`,
  `packages/constructor`, `packages/config`. Application code MUST live under ASCII paths.
- **Resilience:** daily PostgreSQL backups with point-in-time recovery; file versioning in R2.
- Any deviation from this stack MUST be approved by the client before implementation.

## Development Workflow & Quality Gates

- **Staged delivery.** Work proceeds in stages; each stage ends with a working demo and client
  acceptance before it is considered done. Stage 1 = MVP (one product, full constructor, cart,
  checkout, payment, production file, admin, pl/en/uk, analytics, email, responsive, base SEO).
  Stage 2 = visual template editor, promo codes / sales / gift certificates, extended stats.
  Stage 3 = AI (background removal, enhancement, generation), ERP/CRM, delivery integration.
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

**Version**: 1.0.0 | **Ratified**: 2026-07-16 | **Last Amended**: 2026-07-16

# Contracts — Personalized Figurine Storefront (Stage 1)

Interface boundaries between the four modules. These are the stable seams; internals may change
freely behind them (Principle VII).

| Contract | Between | File |
|----------|---------|------|
| Product Schema + Design State | `packages/constructor` ↔ everyone | [constructor-schema.md](constructor-schema.md) |
| Storefront HTTP API | `apps/storefront` ↔ `apps/medusa` | [storefront-api.md](storefront-api.md) |
| Render job | `apps/medusa` (producer) ↔ `apps/render-worker` (consumer) | [render-job.md](render-job.md) |

**Native Medusa APIs** (not re-specified here): Store API for cart, checkout, payment sessions,
and order retrieval; Admin API for orders, products, pricing. Custom endpoints in
`storefront-api.md` cover only what Medusa does not provide (schema fetch, photo upload signing,
authoritative price, render status, production package download, CSV export helper).

**Versioning**: the constructor contract is versioned via `ProductSchema.version`; HTTP endpoints
are prefixed `/store/gl/*` (public) and `/admin/gl/*` (staff). Breaking changes bump the path
segment (`/v2/`) — never silently.

# GiftLab

Personalized acrylic figurine store for the Polish market ("figurka z brzuszkiem"). The
customer picks a character from the catalogue, uploads a face photo (background removed
automatically), adds a name — and the system produces a print-ready 300 DPI file with a
separate cut contour.

The specification lives under [`specs/001-personalized-figurine-store/`](specs/001-personalized-figurine-store/)
(spec-kit / SDD); this README covers the code.

## Monorepo layout

```
packages/
  config           shared tsconfig, ESLint/Prettier, zod env schema
  constructor      the engine — schema, validation, scene, pricing, legal, rendering
  cutout           provider-agnostic background-removal adapter (+ mock)
apps/
  storefront       Next 15 + next-intl (pl/en/uk) storefront, wired to the engine
  render-worker    turns an approved design into the production package
  medusa           commerce backend + admin (Medusa v2) — its own npm install
infra/             docker-compose for Postgres + Redis (optional)
scripts/           local dev helpers (portable Postgres control)
```

### `@gl/constructor` — the keystone

Pure, deterministic logic shared by the storefront preview **and** the render worker, so
"what the customer saw is what gets printed" is true by construction (Constitution II):

- `parseProductSchema` / `parseDesignState` — zod validation incl. the **free-default
  invariant** (a paid default is rejected at publication — Polish consumer law).
- `buildScene` — deterministic paint list from a schema + design.
- `drawScene` — one draw routine for the browser (`renderSceneToCanvas`) and the server
  (`renderScenePng`, Skia via `@napi-rs/canvas`).
- `computePrice` (quantity ladder), `computeWithdrawalRight` (per line), `assessPhoto`
  (warns, never blocks), `buildCutContour`.

## Prerequisites

- Node 20+ and pnpm 9 (`npm i -g pnpm`)
- A local PostgreSQL for the Medusa backend (see below)

## Getting started

```bash
pnpm install            # installs the pnpm workspace (apps/medusa uses its own npm)
pnpm typecheck && pnpm lint && pnpm test
```

### Local database

Production uses Railway's managed Postgres. For local dev, either Docker
(`pnpm dev:infra`) or a portable PostgreSQL build controlled by:

```bash
pnpm db:local:start     # start (default binaries: F:\Freelance\pglocal, override PGLOCAL_HOME)
pnpm db:local:status
pnpm db:local:stop
```

Connection string (matches `.env.example`): `postgres://giftlab:giftlab@localhost:5432/giftlab`

### Run the storefront

```bash
pnpm --filter storefront dev        # http://localhost:3000  (live constructor preview)
```

### Run the Medusa backend

The backend keeps its own npm install (see the note in the layout above).

```bash
cd apps/medusa
cp .env.example .env                 # then set DATABASE_URL / secrets
npm install
npx medusa db:migrate                # apply the schema to your database
npx medusa user -e admin@giftlab.dev -p <password>   # first admin (local dev)
npm run dev                          # backend :9000, admin at :9000/app
```

In development Medusa needs no Redis — it falls back to in-memory modules. In production
set `REDIS_URL` (event bus, cache, workflow engine).

## Deployment (client-owned accounts)

Storefront → Vercel · Backend + Postgres/Redis → Railway · Files (photos, print packages)
→ Cloudflare R2 · Payments → Przelewy24. See the client onboarding doc for what to set up.

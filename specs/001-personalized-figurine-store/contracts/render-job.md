# Contract: Render Job (`apps/medusa` → `apps/render-worker`)

Async production-file generation over BullMQ/Redis. Producer: a Medusa `order.placed`
subscriber. Consumer: the render worker.

## Queue

- Name: `gl:render`
- Backend: Redis (BullMQ)

## Job payload (producer → queue)

```jsonc
{
  "orderId": "order_...",
  "designStateId": "uuid",
  "schemaVersion": 3,
  "requestedFormats": ["png", "pdf", "svg"]
}
```

Idempotency: `jobId = orderId` (an order renders once; re-enqueue is a no-op unless forced).

## Processing (worker)

1. Load DesignState + the exact ProductSchema `schemaVersion` + fetch photos from R2.
2. `buildScene` (shared) → `renderToCanvas` on `@napi-rs/canvas` at 300 DPI → PNG.
3. `buildCutContour` → vector cut path → SVG; compose PDF (raster + `CutContour` spot).
4. Write `spec.json` (resolved parameters) + a preview image.
5. Upload all artifacts to R2 (private); create `ProductionPackage`; set order `render_status`.

## Result (worker → DB)

```jsonc
{
  "orderId": "order_...",
  "status": "ready",              // or "failed"
  "package": {
    "printPngKey": "...", "printPdfKey": "...", "cutSvgKey": "...",
    "specJsonKey": "...", "previewKey": "...", "dpi": 300,
    "renderEngineVersion": "constructor@1.0.0"
  }
}
```

## Reliability

- Retries: 3 attempts, exponential backoff.
- Final failure → order flagged `render_status=failed` + admin alert; design is never lost
  (reproducible from DesignState + schemaVersion).
- SLA target: `ready` < 60s p95 (plan Performance Goals).

## Fidelity guarantee (Principle II)

The worker imports the **same** `buildScene`/`renderToCanvas` from `packages/constructor` used by
the browser preview. A golden-image test renders a fixed DesignState in both environments and
asserts pixel-equivalence within tolerance.

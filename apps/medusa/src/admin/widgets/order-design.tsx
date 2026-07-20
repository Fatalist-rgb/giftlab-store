import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import type { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"

type DesignLine = {
  lineItemId: string
  title: string | null
  quantity: number
  schemaVersion: number
  withdrawalRight: "excluded" | "applies"
  renderStatus: string
  design: {
    characterSelections?: Record<string, string>
    textValues?: Array<{ field_id: string; value: string }>
    quantity?: number
    photoStatus?: string
  } | null
  package: {
    status?: string
    printPngKey?: string | null
    cutSvgKey?: string | null
    specJsonKey?: string | null
    dpi?: number
  } | null
}

const renderTone: Record<string, "green" | "orange" | "red" | "grey" | "blue"> = {
  ready: "green",
  queued: "blue",
  processing: "orange",
  awaiting_photo: "orange",
  failed: "red",
}

/**
 * Personalizacja panel on the order page: per line the frozen design, the statutory
 * per-line withdrawal right and the production package state with its R2 keys.
 */
const OrderDesignWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
  const [lines, setLines] = useState<DesignLine[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch(`/admin/gl/orders/${data.id}/design`, { credentials: "include" })
      .then(async (r) => (r.ok ? await r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { lines: DesignLine[] }) => setLines(body.lines))
      .catch(() => setFailed(true))
  }, [data.id])

  if (failed || (lines !== null && lines.length === 0)) return null

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Personalizacja (GiftLab)</Heading>
      </div>
      {lines === null ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle">Ładowanie…</Text>
        </div>
      ) : (
        lines.map((line) => (
          <div key={line.lineItemId} className="px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Text weight="plus">{line.title ?? "Figurka"}</Text>
              <Text className="text-ui-fg-subtle">× {line.quantity}</Text>
              <Badge size="2xsmall" color={renderTone[line.renderStatus] ?? "grey"}>
                render: {line.renderStatus}
              </Badge>
              <Badge size="2xsmall" color={line.withdrawalRight === "excluded" ? "purple" : "green"}>
                {line.withdrawalRight === "excluded" ? "bez prawa zwrotu (art. 38 pkt 3)" : "zwrot 14 dni"}
              </Badge>
              <Badge size="2xsmall" color="grey">schema v{line.schemaVersion}</Badge>
            </div>
            {line.design && (
              <Text size="small" className="text-ui-fg-subtle mt-1">
                {Object.entries(line.design.characterSelections ?? {})
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")}
                {(line.design.textValues ?? []).map((t) => ` · ${t.field_id}: „${t.value}”`).join("")}
                {` · zdjęcie: ${line.design.photoStatus ?? "—"}`}
              </Text>
            )}
            {line.package?.printPngKey && (
              <Text size="small" className="text-ui-fg-subtle mt-1 font-mono">
                R2: {line.package.printPngKey} · {line.package.cutSvgKey ?? "—"} ({line.package.dpi ?? 300} DPI)
              </Text>
            )}
          </div>
        ))
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default OrderDesignWidget

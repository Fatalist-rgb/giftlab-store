import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
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
    cutoutStatus?: string | null
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
  const { t } = useTranslation()
  const [lines, setLines] = useState<DesignLine[] | null>(null)
  const [failed, setFailed] = useState(false)

  // fetch a short-lived signed URL for one artifact and open it (T054)
  const download = async (lineItemId: string, kind: "printPng" | "cutSvg" | "specJson") => {
    try {
      const res = await fetch(`/admin/gl/orders/${data.id}/lines/${lineItemId}/package`, {
        credentials: "include",
      })
      const body = (await res.json()) as { urls?: Record<string, string | null>; message?: string }
      const url = body.urls?.[kind]
      if (!res.ok || !url) throw new Error(body.message || "package not ready")
      window.open(url, "_blank", "noopener")
    } catch (e) {
      toast.error(t("gl.order.downloadFailed"), { description: (e as Error).message })
    }
  }

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
        <Heading level="h2">{t("gl.order.title")}</Heading>
      </div>
      {lines === null ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle">{t("gl.common.loading")}</Text>
        </div>
      ) : (
        lines.map((line) => (
          <div key={line.lineItemId} className="px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Text weight="plus">{line.title ?? t("gl.order.figurine")}</Text>
              <Text className="text-ui-fg-subtle">× {line.quantity}</Text>
              <Badge size="2xsmall" color={renderTone[line.renderStatus] ?? "grey"}>
                {t("gl.order.render", { status: line.renderStatus })}
              </Badge>
              <Badge size="2xsmall" color={line.withdrawalRight === "excluded" ? "purple" : "green"}>
                {line.withdrawalRight === "excluded" ? t("gl.order.noWithdrawal") : t("gl.order.withdrawal14")}
              </Badge>
              <Badge size="2xsmall" color="grey">{t("gl.order.schema", { version: line.schemaVersion })}</Badge>
              {line.design?.cutoutStatus === "skipped" && (
                <Badge size="2xsmall" color="orange">{t("gl.order.noCutout")}</Badge>
              )}
            </div>
            {line.design && (
              <Text size="small" className="text-ui-fg-subtle mt-1">
                {Object.entries(line.design.characterSelections ?? {})
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")}
                {(line.design.textValues ?? []).map((t) => ` · ${t.field_id}: „${t.value}”`).join("")}
                {` · ${t("gl.order.photo")}: ${line.design.photoStatus ?? "—"}`}
              </Text>
            )}
            {line.package?.printPngKey && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="small" variant="secondary" onClick={() => download(line.lineItemId, "printPng")}>
                  {t("gl.order.printPng")}
                </Button>
                <Button size="small" variant="secondary" onClick={() => download(line.lineItemId, "cutSvg")}>
                  {t("gl.order.cutSvg")}
                </Button>
                <Button size="small" variant="secondary" onClick={() => download(line.lineItemId, "specJson")}>
                  {t("gl.order.specJson")}
                </Button>
                <Text size="small" className="text-ui-fg-subtle">
                  {line.package.dpi ?? 300} DPI
                </Text>
              </div>
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

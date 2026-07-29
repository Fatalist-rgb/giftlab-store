import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ExclamationCircle } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Table, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { formatDateTime } from "../../lib/date"

type FlaggedLine = {
  lineItemId: string
  orderId: string | null
  orderDisplayId: number | null
  renderStatus: "failed" | "awaiting_photo" | "stuck"
  withdrawalRight: "excluded" | "applies"
  createdAt: string
}

const tone: Record<FlaggedLine["renderStatus"], "red" | "orange" | "blue"> = {
  failed: "red",
  stuck: "blue",
  awaiting_photo: "orange",
}

/**
 * Production problem list (T056): every order line whose print file is not ready —
 * failed renders, lines stuck in the queue, and lines waiting for the customer's photo.
 * Failed/stuck lines can be requeued right here.
 */
const ProdukcjaPage = () => {
  const { t, i18n } = useTranslation()
  const [lines, setLines] = useState<FlaggedLine[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch("/admin/gl/orders/flagged", { credentials: "include" })
      .then(async (r) => (r.ok ? await r.json() : Promise.reject(new Error(String(r.status)))))
      .then((b: { lines: FlaggedLine[] }) => setLines(b.lines))
      .catch(() => setLines([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const requeue = async (lineItemId: string) => {
    setBusy(lineItemId)
    try {
      const res = await fetch(`/admin/gl/lines/${lineItemId}/requeue`, {
        method: "POST",
        credentials: "include",
      })
      const body = (await res.json()) as { message?: string }
      if (!res.ok) throw new Error(body.message || "requeue failed")
      toast.success(t("gl.production.requeued"), { description: lineItemId })
      setTimeout(load, 1500)
    } catch (e) {
      toast.error(t("gl.common.failed"), { description: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">{t("gl.production.title")}</Heading>
        <div className="flex gap-2">
          <Button
            size="small"
            variant="secondary"
            onClick={() => window.open("/admin/gl/orders/export", "_blank", "noopener")}
          >
            {t("gl.production.exportCsv")}
          </Button>
          <Button size="small" variant="secondary" onClick={load}>
            {t("gl.common.refresh")}
          </Button>
        </div>
      </div>
      {lines === null ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">{t("gl.common.loading")}</Text>
        </div>
      ) : lines.length === 0 ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">{t("gl.production.allReady")}</Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("gl.production.colOrder")}</Table.HeaderCell>
              <Table.HeaderCell>{t("gl.production.colLine")}</Table.HeaderCell>
              <Table.HeaderCell>{t("gl.production.colStatus")}</Table.HeaderCell>
              <Table.HeaderCell>{t("gl.production.colCreated")}</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {lines.map((l) => (
              <Table.Row key={l.lineItemId}>
                <Table.Cell>
                  {l.orderId ? (
                    <a className="text-ui-fg-interactive" href={`/app/orders/${l.orderId}`}>
                      #{l.orderDisplayId ?? "—"}
                    </a>
                  ) : (
                    "—"
                  )}
                </Table.Cell>
                <Table.Cell>
                  <span className="font-mono text-xs">{l.lineItemId.slice(-12)}</span>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={tone[l.renderStatus]}>
                    {l.renderStatus === "awaiting_photo"
                      ? t("gl.production.awaitingPhoto")
                      : l.renderStatus === "stuck"
                        ? t("gl.production.stuck")
                        : t("gl.production.error")}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="text-ui-fg-subtle">
                    {formatDateTime(l.createdAt, i18n.language)}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  {l.renderStatus !== "awaiting_photo" && (
                    <Button
                      size="small"
                      variant="secondary"
                      disabled={busy === l.lineItemId}
                      onClick={() => requeue(l.lineItemId)}
                    >
                      {busy === l.lineItemId ? "…" : t("gl.production.requeue")}
                    </Button>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  // label is a translation key: the sidebar follows the operator's admin language
  label: "gl.production.nav",
  translationNs: "translation",
  icon: ExclamationCircle,
})

export default ProdukcjaPage

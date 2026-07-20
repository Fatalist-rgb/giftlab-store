import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ExclamationCircle } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Table, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

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
      toast.success("Render ponowiony", { description: lineItemId })
      setTimeout(load, 1500)
    } catch (e) {
      toast.error("Nie udało się", { description: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Produkcja — problemy</Heading>
        <Button size="small" variant="secondary" onClick={load}>
          Odśwież
        </Button>
      </div>
      {lines === null ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Ładowanie…</Text>
        </div>
      ) : lines.length === 0 ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Wszystkie pliki produkcyjne gotowe ✓</Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Zamówienie</Table.HeaderCell>
              <Table.HeaderCell>Linia</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Utworzono</Table.HeaderCell>
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
                    {l.renderStatus === "awaiting_photo" ? "czeka na zdjęcie" : l.renderStatus === "stuck" ? "zablokowany" : "błąd"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="text-ui-fg-subtle">
                    {new Date(l.createdAt).toLocaleString("pl-PL")}
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
                      {busy === l.lineItemId ? "…" : "Ponów render"}
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
  label: "Produkcja",
  icon: ExclamationCircle,
})

export default ProdukcjaPage

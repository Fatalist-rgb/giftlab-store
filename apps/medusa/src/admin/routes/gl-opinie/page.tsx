import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type PendingReview = {
  id: string
  productId: string
  rating: number
  body: string
  author: string
  verifiedBuyer: boolean
  orderDisplayId: number | null
  createdAt: string
}

/** Review moderation queue (T066): publish or reject pending submissions. */
const OpiniePage = () => {
  const [rows, setRows] = useState<PendingReview[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch("/admin/gl/reviews?status=pending", { credentials: "include" })
      .then(async (r) => (r.ok ? await r.json() : Promise.reject(new Error(String(r.status)))))
      .then((b: { reviews: PendingReview[] }) => setRows(b.reviews))
      .catch(() => setRows([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const moderate = async (id: string, decision: "published" | "rejected") => {
    setBusy(id)
    try {
      const res = await fetch(`/admin/gl/reviews/${id}/moderate`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      })
      if (!res.ok) throw new Error(String(res.status))
      toast.success(decision === "published" ? "Opublikowano" : "Odrzucono")
      load()
    } catch (e) {
      toast.error("Nie udało się", { description: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Opinie — moderacja</Heading>
        <Button size="small" variant="secondary" onClick={load}>
          Odśwież
        </Button>
      </div>
      {rows === null ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Ładowanie…</Text>
        </div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Brak opinii do moderacji ✓</Text>
        </div>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Text weight="plus">{r.author}</Text>
              <Badge size="2xsmall" color="orange">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</Badge>
              {r.verifiedBuyer ? (
                <Badge size="2xsmall" color="green">zweryfikowany zakup{r.orderDisplayId ? ` #${r.orderDisplayId}` : ""}</Badge>
              ) : (
                <Badge size="2xsmall" color="grey">niezweryfikowana</Badge>
              )}
              <Text size="small" className="text-ui-fg-subtle">
                {new Date(r.createdAt).toLocaleString("pl-PL")}
              </Text>
            </div>
            <Text size="small" className="mt-1 whitespace-pre-wrap">{r.body}</Text>
            <div className="mt-2 flex gap-2">
              <Button size="small" variant="secondary" disabled={busy === r.id} onClick={() => moderate(r.id, "published")}>
                Publikuj
              </Button>
              <Button size="small" variant="danger" disabled={busy === r.id} onClick={() => moderate(r.id, "rejected")}>
                Odrzuć
              </Button>
            </div>
          </div>
        ))
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Opinie",
  icon: ChatBubbleLeftRight,
})

export default OpiniePage

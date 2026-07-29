import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { formatDateTime } from "../../lib/date"

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
  const { t, i18n } = useTranslation()
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
      toast.success(decision === "published" ? t("gl.reviews.published") : t("gl.reviews.rejected"))
      load()
    } catch (e) {
      toast.error(t("gl.common.failed"), { description: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">{t("gl.reviews.title")}</Heading>
        <Button size="small" variant="secondary" onClick={load}>
          {t("gl.common.refresh")}
        </Button>
      </div>
      {rows === null ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">{t("gl.common.loading")}</Text>
        </div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">{t("gl.reviews.empty")}</Text>
        </div>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Text weight="plus">{r.author}</Text>
              <Badge size="2xsmall" color="orange">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</Badge>
              {r.verifiedBuyer ? (
                <Badge size="2xsmall" color="green">
                  {t("gl.reviews.verified")}
                  {r.orderDisplayId ? ` #${r.orderDisplayId}` : ""}
                </Badge>
              ) : (
                <Badge size="2xsmall" color="grey">{t("gl.reviews.unverified")}</Badge>
              )}
              <Text size="small" className="text-ui-fg-subtle">
                {formatDateTime(r.createdAt, i18n.language)}
              </Text>
            </div>
            <Text size="small" className="mt-1 whitespace-pre-wrap">{r.body}</Text>
            <div className="mt-2 flex gap-2">
              <Button size="small" variant="secondary" disabled={busy === r.id} onClick={() => moderate(r.id, "published")}>
                {t("gl.reviews.publish")}
              </Button>
              <Button size="small" variant="danger" disabled={busy === r.id} onClick={() => moderate(r.id, "rejected")}>
                {t("gl.reviews.reject")}
              </Button>
            </div>
          </div>
        ))
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "gl.reviews.nav",
  translationNs: "translation",
  icon: ChatBubbleLeftRight,
})

export default OpiniePage

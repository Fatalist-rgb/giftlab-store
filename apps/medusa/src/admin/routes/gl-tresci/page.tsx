import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Button, Container, Heading, Input, Select, Text, Textarea, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

type Page = { id: string; slug: string; locale: string; title: string; body: string; updatedAt: string }

/**
 * Content editor (T063): the legal/info pages (regulamin, privacy, cookies, zwroty,
 * dostawa, kontakt, withdrawal-notice) editable without a deploy. Polish is the base;
 * en/uk fall back to pl on the storefront until translated here.
 */
const TresciPage = () => {
  const { t } = useTranslation()
  const [pages, setPages] = useState<Page[] | null>(null)
  const [slug, setSlug] = useState("regulamin")
  const [locale, setLocale] = useState("pl")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    fetch("/admin/gl/content", { credentials: "include" })
      .then(async (r) => (r.ok ? await r.json() : Promise.reject(new Error(String(r.status)))))
      .then((b: { pages: Page[] }) => setPages(b.pages))
      .catch(() => setPages([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // when slug/locale changes, prefill from the loaded pages
  useEffect(() => {
    const existing = pages?.find((p) => p.slug === slug && p.locale === locale)
    setTitle(existing?.title ?? "")
    setBody(existing?.body ?? "")
  }, [slug, locale, pages])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/admin/gl/content", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, locale, title, body }),
      })
      if (!res.ok) throw new Error(String(res.status))
      toast.success(t("gl.content.saved"), { description: `${slug} (${locale})` })
      load()
    } catch (e) {
      toast.error(t("gl.content.saveFailed"), { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const slugs = [
    "regulamin", "privacy", "cookies", "zwroty", "dostawa", "kontakt", "withdrawal-notice",
  ]

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">{t("gl.content.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("gl.content.hint")}
        </Text>
      </div>
      <div className="space-y-3 px-6 py-4">
        <div className="flex gap-2">
          <Select value={slug} onValueChange={setSlug}>
            <Select.Trigger className="w-64">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {slugs.map((s) => (
                <Select.Item key={s} value={s}>
                  {s}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Select value={locale} onValueChange={setLocale}>
            <Select.Trigger className="w-28">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {["pl", "en", "uk"].map((l) => (
                <Select.Item key={l} value={l}>
                  {l.toUpperCase()}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("gl.content.titlePlaceholder")}
        />
        <Textarea
          rows={16}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("gl.content.bodyPlaceholder")}
        />
        <Button onClick={save} disabled={saving || !title.trim() || !body.trim()}>
          {saving ? "…" : t("gl.content.save")}
        </Button>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "gl.content.nav",
  translationNs: "translation",
  icon: DocumentText,
})

export default TresciPage

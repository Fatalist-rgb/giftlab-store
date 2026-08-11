import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Photo } from "@medusajs/icons"
import { Button, Container, Heading, Input, Select, Switch, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Hero slide editor: the storefront's home carousel, editable without a deploy.
 * Slides live as ONE JSON document in the content module (slug `hero-slides`);
 * this page renders them as a friendly form — image upload, per-language texts,
 * sticker colour, order — and writes the JSON back on save.
 */

type Lang = "pl" | "en" | "uk"
type Slide = {
  image: string
  badge: Record<string, string>
  title: Record<string, string>
  sub: Record<string, string>
  badgeBg: "mandarin" | "lime" | "pink" | "blue"
  pos?: string
  enabled?: boolean
}

const LANGS: Lang[] = ["pl", "en", "uk"]
const COLORS = [
  { value: "mandarin", label: "Pomarańczowy" },
  { value: "lime", label: "Limonkowy" },
  { value: "pink", label: "Różowy" },
  { value: "blue", label: "Niebieski" },
]
const POSITIONS = [
  { value: "72% center", label: "Figurki po prawej" },
  { value: "center", label: "Figurki na środku" },
  { value: "30% center", label: "Figurki po lewej" },
]

const emptySlide = (): Slide => ({
  image: "",
  badge: { pl: "" },
  title: { pl: "" },
  sub: { pl: "" },
  badgeBg: "mandarin",
  pos: "72% center",
  enabled: true,
})

const SlajdyPage = () => {
  const [slides, setSlides] = useState<Slide[] | null>(null)
  const [lang, setLang] = useState<Lang>("pl")
  const [saving, setSaving] = useState(false)
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({})

  const load = useCallback(() => {
    fetch("/admin/gl/content", { credentials: "include" })
      .then(async (r) => (r.ok ? await r.json() : Promise.reject(new Error(String(r.status)))))
      .then((b: { pages: Array<{ slug: string; locale: string; body: string }> }) => {
        const doc = b.pages.find((p) => p.slug === "hero-slides" && p.locale === "pl")
        try {
          setSlides(doc ? (JSON.parse(doc.body) as Slide[]) : [])
        } catch {
          setSlides([])
        }
      })
      .catch(() => setSlides([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const patch = (i: number, fn: (s: Slide) => Slide) =>
    setSlides((cur) => (cur ? cur.map((s, k) => (k === i ? fn({ ...s }) : s)) : cur))

  const move = (i: number, dir: -1 | 1) =>
    setSlides((cur) => {
      if (!cur) return cur
      const j = i + dir
      if (j < 0 || j >= cur.length) return cur
      const next = [...cur]
      ;[next[i], next[j]] = [next[j]!, next[i]!]
      return next
    })

  const upload = async (i: number, file: File) => {
    const fd = new FormData()
    fd.append("files", file)
    try {
      const res = await fetch("/admin/uploads", { method: "POST", credentials: "include", body: fd })
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as { files?: Array<{ url: string }> }
      const url = body.files?.[0]?.url
      if (!url) throw new Error("brak adresu pliku")
      patch(i, (s) => ({ ...s, image: url }))
      toast.success("Zdjęcie wgrane")
    } catch (e) {
      toast.error("Nie udało się wgrać zdjęcia", { description: (e as Error).message })
    }
  }

  const save = async () => {
    if (!slides) return
    for (const [i, s] of slides.entries()) {
      if (!s.image || !s.title.pl?.trim()) {
        toast.error(`Slajd ${i + 1}: wymagane zdjęcie i tytuł (PL)`)
        return
      }
    }
    setSaving(true)
    try {
      const res = await fetch("/admin/gl/content", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: "hero-slides",
          locale: "pl",
          title: "Slajdy hero (dokument techniczny)",
          body: JSON.stringify(slides, null, 2),
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      toast.success("Slajdy zapisane", { description: "Strona główna odświeży się do 2 minut." })
    } catch (e) {
      toast.error("Nie udało się zapisać", { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  if (!slides) {
    return (
      <Container className="p-6">
        <Text>Ładowanie…</Text>
      </Container>
    )
  }

  return (
    <Container className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">Slajdy na stronie głównej</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Zdjęcie, naklejka, tytuł i podtytuł każdego slajdu. Polski jest wymagany; EN/UK
            opcjonalne (bez tłumaczenia sklep pokaże wersję polską).
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
            <Select.Trigger className="w-[120px]">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {LANGS.map((l) => (
                <Select.Item key={l} value={l}>
                  {l.toUpperCase()}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Button onClick={save} isLoading={saving}>
            Zapisz
          </Button>
        </div>
      </div>

      {slides.map((s, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-[220px] shrink-0">
              {s.image ? (
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                <img src={s.image} alt="" className="aspect-[2.35/1] w-full rounded-md border object-cover" />
              ) : (
                <div className="flex aspect-[2.35/1] w-full items-center justify-center rounded-md border text-ui-fg-subtle">
                  brak zdjęcia
                </div>
              )}
              <input
                ref={(el) => {
                  fileInputs.current[i] = el
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void upload(i, f)
                  e.target.value = ""
                }}
              />
              <div className="mt-2 flex gap-2">
                <Button size="small" variant="secondary" onClick={() => fileInputs.current[i]?.click()}>
                  Wgraj zdjęcie
                </Button>
              </div>
              <Input
                className="mt-2"
                placeholder="…lub adres URL zdjęcia"
                value={s.image}
                onChange={(e) => patch(i, (x) => ({ ...x, image: e.target.value }))}
              />
            </div>

            <div className="min-w-[260px] flex-1 space-y-2">
              <Input
                placeholder={`Naklejka (${lang.toUpperCase()})`}
                value={s.badge[lang] ?? ""}
                onChange={(e) => patch(i, (x) => ({ ...x, badge: { ...x.badge, [lang]: e.target.value } }))}
              />
              <Input
                placeholder={`Tytuł (${lang.toUpperCase()})${lang === "pl" ? " — wymagany" : ""}`}
                value={s.title[lang] ?? ""}
                onChange={(e) => patch(i, (x) => ({ ...x, title: { ...x.title, [lang]: e.target.value } }))}
              />
              <Input
                placeholder={`Podtytuł (${lang.toUpperCase()})`}
                value={s.sub[lang] ?? ""}
                onChange={(e) => patch(i, (x) => ({ ...x, sub: { ...x.sub, [lang]: e.target.value } }))}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Select value={s.badgeBg} onValueChange={(v) => patch(i, (x) => ({ ...x, badgeBg: v as Slide["badgeBg"] }))}>
                  <Select.Trigger className="w-[180px]">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {COLORS.map((c) => (
                      <Select.Item key={c.value} value={c.value}>
                        {c.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                <Select value={s.pos ?? "72% center"} onValueChange={(v) => patch(i, (x) => ({ ...x, pos: v }))}>
                  <Select.Trigger className="w-[200px]">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {POSITIONS.map((p) => (
                      <Select.Item key={p.value} value={p.value}>
                        {p.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={s.enabled !== false}
                    onCheckedChange={(v) => patch(i, (x) => ({ ...x, enabled: v }))}
                  />
                  <Text size="small">widoczny</Text>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-1.5">
              <Button size="small" variant="secondary" disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </Button>
              <Button size="small" variant="secondary" disabled={i === slides.length - 1} onClick={() => move(i, 1)}>
                ↓
              </Button>
              <Button
                size="small"
                variant="danger"
                onClick={() => setSlides((cur) => cur!.filter((_, k) => k !== i))}
              >
                Usuń
              </Button>
            </div>
          </div>
        </div>
      ))}

      <div>
        <Button variant="secondary" onClick={() => setSlides((cur) => [...(cur ?? []), emptySlide()])}>
          + Dodaj slajd
        </Button>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Slajdy",
  icon: Photo,
})

export default SlajdyPage

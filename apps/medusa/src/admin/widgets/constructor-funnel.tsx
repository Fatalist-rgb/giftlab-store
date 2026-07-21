import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Funnel = {
  days: number
  designsCreated: number
  personalizedShare: number | null
  orderLines: number
  conversion: number | null
}

/**
 * Constructor funnel (T071b) on the admin home: designs added to cart vs paid order
 * lines over the last 30 days, computed from our own database (no analytics needed).
 */
const ConstructorFunnelWidget = () => {
  const [f, setF] = useState<Funnel | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch("/admin/gl/funnel?days=30", { credentials: "include" })
      .then(async (r) => (r.ok ? await r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setF)
      .catch(() => setFailed(true))
  }, [])

  if (failed) return null

  return (
    <Container className="p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Lejek konstruktora (30 dni)</Heading>
        {f === null ? (
          <Text className="text-ui-fg-subtle mt-1">Ładowanie…</Text>
        ) : (
          <div className="mt-2 flex flex-wrap gap-6">
            <div>
              <Text size="small" className="text-ui-fg-subtle">Projekty (do koszyka)</Text>
              <Heading level="h3">{f.designsCreated}</Heading>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Z personalizacją</Text>
              <Heading level="h3">{f.personalizedShare === null ? "—" : `${f.personalizedShare}%`}</Heading>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Linie opłaconych zamówień</Text>
              <Heading level="h3">{f.orderLines}</Heading>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Konwersja koszyk → zakup</Text>
              <Heading level="h3">{f.conversion === null ? "—" : `${f.conversion}%`}</Heading>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default ConstructorFunnelWidget

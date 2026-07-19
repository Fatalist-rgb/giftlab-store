import { ExecArgs } from '@medusajs/framework/types'
import { CONTENT_MODULE } from '../modules/content'
import type ContentModuleService from '../modules/content/service'

/**
 * Seed the Polish base of the legal / info pages so the structure exists in the admin
 * for editing (FR-036). Bodies are clearly-marked placeholders — the client replaces
 * them with the real, lawyer-approved text. Idempotent (upsert per slug). Run with:
 *   npx medusa exec ./src/scripts/seed-content.ts
 */
const TODO = '[szablon — do uzupełnienia rzeczywistą treścią prawną]'

const PAGES: Array<{ slug: string; title: string; body: string; meta_title: string }> = [
  { slug: 'regulamin', title: 'Regulamin', body: `Regulamin sklepu. ${TODO}`, meta_title: 'Regulamin' },
  { slug: 'privacy', title: 'Polityka prywatności', body: `Zasady przetwarzania danych (RODO). ${TODO}`, meta_title: 'Polityka prywatności' },
  { slug: 'cookies', title: 'Polityka cookies', body: `Informacja o plikach cookies. ${TODO}`, meta_title: 'Polityka cookies' },
  { slug: 'zwroty', title: 'Zwroty i reklamacje', body: `Zwroty, reklamacje i prawo odstąpienia (z wyłączeniem produktów personalizowanych — art. 38 pkt 3 UPK). ${TODO}`, meta_title: 'Zwroty i reklamacje' },
  { slug: 'dostawa', title: 'Dostawa', body: `Metody i terminy dostawy (okno dostawy z uwzględnieniem produkcji). ${TODO}`, meta_title: 'Dostawa' },
  { slug: 'kontakt', title: 'Kontakt', body: `Dane kontaktowe sprzedawcy. ${TODO}`, meta_title: 'Kontakt' },
]

export default async function ({ container }: ExecArgs) {
  const svc: ContentModuleService = container.resolve(CONTENT_MODULE)
  for (const p of PAGES) {
    await svc.upsertPage({
      slug: p.slug,
      locale: 'pl',
      title: p.title,
      body: p.body,
      meta_title: p.meta_title,
      meta_description: p.title,
    })
  }
  const all = await svc.listContentPages({ locale: 'pl' })
  console.log(`seeded/updated ${PAGES.length} PL pages; total PL pages now: ${all.length}`)
  console.log('slugs:', all.map((x) => x.slug).sort().join(', '))
}

import { ExecArgs } from '@medusajs/framework/types'
import { CONTENT_MODULE } from '../modules/content'
import type ContentModuleService from '../modules/content/service'

/**
 * Seed the hero slides document (slug `hero-slides`) with the three launch strips.
 * Idempotent: an existing document is NEVER overwritten — the admin owns it after
 * the first run. Run: npx medusa exec ./src/scripts/seed-hero-slides.ts
 */
const SLIDES = [
  {
    image: '/photos/hero-crew.webp',
    badge: { pl: 'Cała ekipa!', en: 'The whole crew!', uk: 'Уся банда!' },
    title: {
      pl: 'Zamień zdjęcie w urocze akrylowe cudo',
      en: 'Turn a photo into an adorable acrylic wonder',
      uk: 'Перетвори фото на чарівне акрилове диво',
    },
    sub: {
      pl: 'Twoja twarz, miękki brzuszek i magnes — 11 cm radości.',
      en: 'Your face, a soft belly and a magnet — 11 cm of joy.',
      uk: 'Твоє обличчя, м’який животик і магніт — 11 см радості.',
    },
    badgeBg: 'mandarin',
    pos: '72% center',
    enabled: true,
  },
  {
    image: '/photos/hero-fridge.webp',
    badge: { pl: 'Magnes na lodówkę', en: 'Fridge magnet', uk: 'Магніт на холодильник' },
    title: {
      pl: 'Trzyma się lodówki jak przyklejony',
      en: 'Holds onto the fridge like glue',
      uk: 'Тримається холодильника як приклеєний',
    },
    sub: {
      pl: 'Magnes na całe plecy — trzaskanie drzwiami mu niestraszne.',
      en: 'A full-back magnet — door slams don’t scare it.',
      uk: 'Магніт на всю спину — грюкання дверцятами не страшне.',
    },
    badgeBg: 'lime',
    pos: '70% center',
    enabled: true,
  },
  {
    image: '/photos/hero-rocznica.webp',
    badge: { pl: 'Na rocznicę', en: 'Anniversary-ready', uk: 'На річницю' },
    title: {
      pl: 'Dwie figurki, jedna rocznica',
      en: 'Two figurines, one anniversary',
      uk: 'Дві фігурки, одна річниця',
    },
    sub: {
      pl: 'Wy dwoje w akrylu — róże i świeczka w komplecie.',
      en: 'The two of you in acrylic — roses and a candle included.',
      uk: 'Ви двоє в акрилі — троянди й свічка в комплекті.',
    },
    badgeBg: 'pink',
    pos: '72% center',
    enabled: true,
  },
]

export default async function ({ container }: ExecArgs) {
  const content: ContentModuleService = container.resolve(CONTENT_MODULE)
  const existing = await content.getPage('hero-slides', 'pl')
  if (existing) {
    console.log('hero-slides already exists — leaving the admin-owned document alone')
    return
  }
  await content.upsertPage({
    slug: 'hero-slides',
    locale: 'pl',
    title: 'Slajdy hero (dokument techniczny)',
    body: JSON.stringify(SLIDES, null, 2),
    meta_title: null,
    meta_description: null,
  })
  console.log(`seeded hero-slides with ${SLIDES.length} slides`)
}

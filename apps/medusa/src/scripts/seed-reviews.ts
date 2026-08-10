import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { REVIEW_MODULE } from '../modules/review'
import type ReviewModuleService from '../modules/review/service'
import { FIGURINE_HANDLE, FIGURINE_PRODUCT_ID } from './seed-figurine'

/**
 * Seed the four PLACEHOLDER reviews the approved demo shows, so the live PDP block
 * looks the same. Deliberately NOT verified_buyer: these are not real purchases, and
 * faking the "verified buyer" mark is a UCPD blacklist practice. They exist to be
 * REPLACED by real reviews before real marketing traffic — the shop owner sees and
 * can delete them in the admin. Idempotent by author+photo. Run with:
 *   npx medusa exec ./src/scripts/seed-reviews.ts
 */
const SEED = [
  {
    author_name: 'Anna K.',
    rating: 5,
    body: 'Podobieństwo 10/10, a brzuszek rozłożył całą rodzinę. Tata trzyma ją na lodówce i chwali się gościom.',
    photo_key: '/photos/rev-fotel.webp',
    avatar_key: '/photos/av-1.webp',
    variant_label: 'W fotelu z kuflem',
  },
  {
    author_name: 'Piotr W.',
    rating: 5,
    body: 'Podgląd w kreatorze zgadzał się z tym, co przyszło. Akryl solidny, kolory żywe, zero smug.',
    photo_key: '/photos/rev-komoda.webp',
    avatar_key: '/photos/av-4.webp',
    variant_label: 'Z kuflem, na komodzie',
  },
  {
    author_name: 'Magda S.',
    rating: 5,
    body: 'Imię na figurce czyta się z drugiego końca kuchni. Magnes trzyma pewnie, nie zsuwa się.',
    photo_key: '/photos/rev-kuchnia.webp',
    avatar_key: '/photos/av-3.webp',
    variant_label: 'Na leżąco z piwem',
  },
  {
    author_name: 'Tomek R.',
    rating: 4,
    body: 'Figurka super, ale czekałem dzień dłużej niż obiecali. Sam brzuszek wyszedł idealnie — stąd cztery gwiazdki, nie trzy.',
    photo_key: '/photos/rev-przedpokoj.webp',
    avatar_key: '/photos/av-2.webp',
    variant_label: 'Na stojąco, w przedpokoju',
  },
]

export default async function ({ container }: ExecArgs) {
  const products = container.resolve(Modules.PRODUCT)
  const [flagship] = await products.listProducts({ handle: FIGURINE_HANDLE })
  const productId = flagship?.id ?? FIGURINE_PRODUCT_ID
  console.log(`target product: ${productId}`)

  const reviews: ReviewModuleService = container.resolve(REVIEW_MODULE)
  for (const r of SEED) {
    const [existing] = await reviews.listReviews(
      { medusa_product_id: productId, author_name: r.author_name, photo_key: r.photo_key },
      { take: 1 },
    )
    if (existing) {
      console.log(`skip (exists): ${r.author_name}`)
      continue
    }
    const [row] = await reviews.createReviews([
      {
        medusa_product_id: productId,
        rating: r.rating,
        body: r.body,
        author_name: r.author_name,
        locale: 'pl' as const,
        photo_key: r.photo_key,
        avatar_key: r.avatar_key,
        variant_label: r.variant_label,
        verified_buyer: false,
        order_display_id: null,
        status: 'published' as const,
        published_at: new Date(),
      },
    ])
    console.log(`seeded: ${r.author_name} (${row.id})`)
  }
  console.log('done')
}

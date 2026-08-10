import { ExecArgs } from '@medusajs/framework/types'
import { REVIEW_MODULE } from '../modules/review'
import type ReviewModuleService from '../modules/review/service'

/** One-off: hide the pre-launch TEST review (Zosia F.) from the live PDP. */
export default async function ({ container }: ExecArgs) {
  const reviews: ReviewModuleService = container.resolve(REVIEW_MODULE)
  const rows = await reviews.listReviews({ author_name: 'Zosia F.' }, { take: 10 })
  for (const r of rows) {
    await reviews.moderate(r.id, 'rejected')
    console.log(`rejected: ${r.id} (${r.author_name})`)
  }
  if (!rows.length) console.log('nothing to hide')
}

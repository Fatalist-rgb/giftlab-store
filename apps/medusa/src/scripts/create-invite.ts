import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { createInvitesWorkflow, refreshInviteTokensWorkflow } from '@medusajs/medusa/core-flows'

/** Invite the shop owner into the admin. Prints the one-time invite link — the
 *  invitee sets their own password there. Run:
 *    npx medusa exec ./src/scripts/create-invite.ts */
const EMAIL = 'mavorashop2026@gmail.com'
const ADMIN_URL = 'https://backend-production-8e23.up.railway.app/app'

export default async function ({ container }: ExecArgs) {
  const users = container.resolve(Modules.USER)
  const [existing] = await users.listInvites({ email: EMAIL })
  let token: string
  if (existing && !existing.accepted) {
    const { result } = await refreshInviteTokensWorkflow(container).run({ input: { invite_ids: [existing.id] } })
    token = result[0]!.token
    console.log(`invite refreshed for ${EMAIL}`)
  } else if (existing?.accepted) {
    console.log(`already accepted: ${EMAIL} — nothing to do`)
    return
  } else {
    const { result } = await createInvitesWorkflow(container).run({
      input: { invites: [{ email: EMAIL }] },
    })
    token = result[0]!.token
    console.log(`invite created for ${EMAIL}`)
  }
  console.log(`INVITE LINK: ${ADMIN_URL}/invite?token=${token}`)
}

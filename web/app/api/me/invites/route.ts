import { acceptInvite } from '@/lib/invites.ts'
import { requireUser } from '@/lib/session.ts'
import { BadRequest, respond } from '../../respond.ts'

// Accepts an invite for the signed-in person. A POST, so following a link alone never links an account.
export async function POST(req: Request) {
  return respond(async () => {
    const user = await requireUser()
    const { token } = (await req.json().catch(() => ({}))) as { token?: unknown }
    if (typeof token !== 'string' || !token) throw new BadRequest('missing invite')
    const { state, businessName } = await acceptInvite(token, user.id)
    return { state, businessName }
  })
}

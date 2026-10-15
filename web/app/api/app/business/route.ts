import { createBusiness, membershipsOf } from '@/lib/businesses.ts'
import { requireUser } from '@/lib/session.ts'
import { BadRequest, respond } from '../../respond.ts'

// Creates the signed-in person's business. One business per account for now.
export async function POST(req: Request) {
  return respond(async () => {
    const user = await requireUser()
    const { name } = (await req.json().catch(() => ({}))) as { name?: unknown }
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
      throw new BadRequest('Give your business a name of up to 80 characters.')
    }
    const [existing] = await membershipsOf(user.id)
    if (existing) return existing
    return await createBusiness(name, user.id)
  })
}

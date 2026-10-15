import type { NextRequest } from 'next/server'
import { findCustomer } from '@/lib/customers.ts'
import { createInvite } from '@/lib/invites.ts'
import { requireOperator } from '@/lib/session.ts'
import { NotFound, respond } from '../../../../respond.ts'

// A single-use sign-up link for one customer, shown once to the operator to pass on.
export async function POST(_req: NextRequest, ctx: RouteContext<'/api/app/customers/[id]/invite'>) {
  const { id } = await ctx.params
  return respond(async () => {
    const { user, business } = await requireOperator()
    const customer = await findCustomer(business.id, decodeURIComponent(id))
    if (!customer) throw new NotFound('customer not found')
    return await createInvite(customer, user.id)
  })
}

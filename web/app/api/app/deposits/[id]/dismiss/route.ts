import type { NextRequest } from 'next/server'
import { businessDeposit, dismissDeposit } from '@/lib/deposits.ts'
import { requireOperator } from '@/lib/session.ts'
import { NotFound, respond } from '../../../../respond.ts'

// Hides a failed deposit from the feed. The record stays, with who dismissed it.
export async function POST(_req: NextRequest, ctx: RouteContext<'/api/app/deposits/[id]/dismiss'>) {
  const { id } = await ctx.params
  return respond(async () => {
    const { user, business } = await requireOperator()
    if (!(await businessDeposit(business.id, decodeURIComponent(id)))) throw new NotFound('deposit not found')
    const d = (await dismissDeposit(decodeURIComponent(id), user.id))!
    return { id: d.instruction_cid, state: d.state, dismissed: d.dismissed_at !== null }
  })
}

import type { NextRequest } from 'next/server'
import { businessDeposit, retryDeposit } from '@/lib/deposits.ts'
import { requireOperator } from '@/lib/session.ts'
import { NotFound, respond } from '../../../../respond.ts'

// Sends a failed deposit back to the step it reached; the tick that follows the response picks it up.
export async function POST(_req: NextRequest, ctx: RouteContext<'/api/app/deposits/[id]/retry'>) {
  const { id } = await ctx.params
  return respond(async () => {
    const { business } = await requireOperator()
    if (!(await businessDeposit(business.id, decodeURIComponent(id)))) throw new NotFound('deposit not found')
    const d = (await retryDeposit(decodeURIComponent(id)))!
    return { id: d.instruction_cid, state: d.state }
  })
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60

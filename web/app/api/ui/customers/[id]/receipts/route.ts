import type { NextRequest } from 'next/server'
import { findCustomer } from '@/lib/customers.ts'
import { receiptViews } from '@/lib/views.ts'
import { NotFound, respond } from '../../../respond.ts'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/ui/customers/[id]/receipts'>) {
  const { id } = await ctx.params
  return respond(async () => {
    const customer = await findCustomer(decodeURIComponent(id))
    if (!customer) throw new NotFound('customer not found')
    return receiptViews(customer)
  })
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60

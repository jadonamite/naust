import type { NextRequest } from 'next/server'
import { publicBusiness } from '@/lib/businesses.ts'
import { findCustomer } from '@/lib/customers.ts'
import { receiptViews } from '@/lib/views.ts'
import { NotFound, respond } from '../../../../respond.ts'

export async function GET(req: NextRequest, ctx: RouteContext<'/api/demo/customers/[id]/receipts'>) {
  const { id } = await ctx.params
  return respond(async () => {
    const customer = await findCustomer((await publicBusiness(req.nextUrl.searchParams.get('op'))).id, decodeURIComponent(id))
    if (!customer) throw new NotFound('customer not found')
    return receiptViews(customer)
  })
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60

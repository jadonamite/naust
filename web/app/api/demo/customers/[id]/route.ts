import type { NextRequest } from 'next/server'
import { publicBusiness } from '@/lib/businesses.ts'
import { findCustomer } from '@/lib/customers.ts'
import { customerViews } from '@/lib/views.ts'
import { NotFound, respond } from '../../../respond.ts'

export async function GET(req: NextRequest, ctx: RouteContext<'/api/demo/customers/[id]'>) {
  const { id } = await ctx.params
  return respond(async () => {
    const business = await publicBusiness(req.nextUrl.searchParams.get('op'))
    const customer = await findCustomer(business.id, decodeURIComponent(id))
    if (!customer) throw new NotFound('customer not found')
    return (await customerViews(business.id)).find((c) => c.id === customer.id)
  })
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60

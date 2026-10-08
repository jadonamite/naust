import type { NextRequest } from 'next/server'
import { findCustomer } from '@/lib/customers.ts'
import { customerViews } from '@/lib/views.ts'
import { NotFound, respond } from '../../respond.ts'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/ui/customers/[id]'>) {
  const { id } = await ctx.params
  return respond(async () => {
    const customer = await findCustomer(decodeURIComponent(id))
    if (!customer) throw new NotFound('customer not found')
    return (await customerViews()).find((c) => c.id === customer.id)
  })
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60

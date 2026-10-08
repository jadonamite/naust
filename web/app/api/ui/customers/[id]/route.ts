import type { NextRequest } from 'next/server'
import { findCustomer } from '@/lib/customers.ts'
import { customerViews } from '@/lib/views.ts'
import { respond } from '../../respond.ts'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/ui/customers/[id]'>) {
  const { id } = await ctx.params
  const customer = findCustomer(decodeURIComponent(id))
  if (!customer) return Response.json({ error: 'customer not found' }, { status: 404 })
  return respond(() => customerViews().find((c) => c.id === customer.id))
}

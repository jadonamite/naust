import type { NextRequest } from 'next/server'
import { requireOperator } from '@/lib/session.ts'
import { depositViews } from '@/lib/views.ts'
import { respond } from '../../respond.ts'

export function GET(req: NextRequest) {
  const customer = req.nextUrl.searchParams.get('customer') ?? undefined
  return respond(async () => depositViews((await requireOperator()).business.id, customer))
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60

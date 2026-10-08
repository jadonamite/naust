import type { NextRequest } from 'next/server'
import { depositViews } from '@/lib/views.ts'
import { respond } from '../respond.ts'

export function GET(req: NextRequest) {
  const customer = req.nextUrl.searchParams.get('customer') ?? undefined
  return respond(() => depositViews(customer))
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60

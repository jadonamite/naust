import type { NextRequest } from 'next/server'
import { depositViews } from '@/lib/views.ts'
import { respond } from '../respond.ts'

export function GET(req: NextRequest) {
  const customer = req.nextUrl.searchParams.get('customer') ?? undefined
  return respond(() => depositViews(customer))
}

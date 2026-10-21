import type { NextRequest } from 'next/server'
import { publicBusiness } from '@/lib/businesses.ts'
import { customerViews } from '@/lib/views.ts'
import { respond } from '../../respond.ts'

export function GET(req: NextRequest) {
  return respond(async () => customerViews((await publicBusiness(req.nextUrl.searchParams.get('op'))).id))
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60

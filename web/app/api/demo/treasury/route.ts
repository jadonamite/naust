import type { NextRequest } from 'next/server'
import { publicBusiness } from '@/lib/businesses.ts'
import { treasuryView } from '@/lib/views.ts'
import { respond } from '../../respond.ts'

export function GET(req: NextRequest) {
  return respond(async () => {
    const business = await publicBusiness(req.nextUrl.searchParams.get('op'))
    // Only the demo uses the node's primary party; any other business shows a treasury once it has its own.
    return business.is_demo || business.treasury_party ? treasuryView(business.id) : null
  })
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60

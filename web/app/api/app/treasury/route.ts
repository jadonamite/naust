import { requireOperator } from '@/lib/session.ts'
import { treasuryView } from '@/lib/views.ts'
import { respond } from '../../respond.ts'

// A business has a treasury once it is the demo or has its own treasury party.
export function GET() {
  return respond(async () => {
    const { business } = await requireOperator()
    return business.is_demo || business.treasury_party ? await treasuryView(business.id) : null
  })
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60

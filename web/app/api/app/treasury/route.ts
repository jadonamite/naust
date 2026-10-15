import { requireOperator } from '@/lib/session.ts'
import { treasuryView } from '@/lib/views.ts'
import { respond } from '../../respond.ts'

// Only the demo business has a ledger connection until businesses can connect their own.
export function GET() {
  return respond(async () => ((await requireOperator()).business.is_demo ? await treasuryView() : null))
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60

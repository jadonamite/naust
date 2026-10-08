import { treasuryView } from '@/lib/views.ts'
import { respond } from '../respond.ts'

export function GET() {
  return respond(() => treasuryView())
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60

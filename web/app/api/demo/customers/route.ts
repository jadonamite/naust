import { demoBusiness } from '@/lib/businesses.ts'
import { customerViews } from '@/lib/views.ts'
import { respond } from '../../respond.ts'

export function GET() {
  return respond(async () => customerViews((await demoBusiness()).id))
}

// Leaves room for the tick that runs after the response (lib/tick.ts).
export const maxDuration = 60

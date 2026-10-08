import { treasuryView } from '@/lib/views.ts'
import { respond } from '../respond.ts'

export function GET() {
  return respond(() => treasuryView())
}

import type { NextRequest } from 'next/server'
import { tick } from '@/lib/tick.ts'

// Scheduled deposit work: Vercel Cron (daily) and the GitHub Actions workflow (every 5 minutes) call this.
// Both send `Authorization: Bearer $CRON_SECRET`; anyone else gets 401.
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    return Response.json(await tick())
  } catch (e) {
    return Response.json({ error: (e as Error).message.slice(0, 300) }, { status: 500 })
  }
}

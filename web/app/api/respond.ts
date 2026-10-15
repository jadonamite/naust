import { after } from 'next/server'
import { LedgerError } from '@/lib/ledger.ts'
import { tick } from '@/lib/tick.ts'
import { Forbidden, Unauthorized } from '@/lib/session.ts'

// Lookups throw these so the shared handler can answer 404 or 400.
export class NotFound extends Error {}
export class BadRequest extends Error {}

// Ledger failures surface as 502 so the screens can tell "ledger unreachable" from "not found".
// Every screen poll also offers to run a deposit tick after responding; the lease in lib/tick.ts keeps it to one at a time.
export async function respond(fn: () => unknown): Promise<Response> {
  after(() => tick().catch((e) => console.error('tick failed:', (e as Error).message)))
  try {
    return Response.json(await fn())
  } catch (e) {
    if (e instanceof NotFound) return Response.json({ error: e.message }, { status: 404 })
    if (e instanceof Unauthorized) return Response.json({ error: e.message }, { status: 401 })
    if (e instanceof Forbidden) return Response.json({ error: e.message }, { status: 403 })
    if (e instanceof BadRequest) return Response.json({ error: e.message }, { status: 400 })
    const status = e instanceof LedgerError ? 502 : 500
    return Response.json({ error: (e as Error).message.slice(0, 300) }, { status })
  }
}

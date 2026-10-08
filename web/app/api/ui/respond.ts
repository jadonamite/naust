import { LedgerError } from '@/lib/ledger.ts'

// Ledger failures surface as 502 so the screens can tell "ledger unreachable" from "not found".
export async function respond(fn: () => unknown): Promise<Response> {
  try {
    return Response.json(await fn())
  } catch (e) {
    const status = e instanceof LedgerError ? 502 : 500
    return Response.json({ error: (e as Error).message.slice(0, 300) }, { status })
  }
}

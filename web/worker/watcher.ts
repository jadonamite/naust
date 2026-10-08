// The deposit watcher: polls every customer address, records new incoming transfers and drives each to swept.
// Run with `npm run watch` from web/. Runs beside Next.js, sharing lib/ and the SQLite file.
import { env } from '../lib/env.ts'
import { TRANSFER_INSTRUCTION, activeContracts, ledgerEnd } from '../lib/ledger.ts'
import { listCustomers, reconcileCustomers } from '../lib/customers.ts'
import { advance, recordSeen, unfinishedDeposits } from '../lib/deposits.ts'

const MAX_BACKOFF_MS = 30_000
let stopping = false
const inFlight = new Set<string>()
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => (stopping = true))

const log = (...args: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...args)
const short = (s: string) => s.slice(0, 12)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function tick(): Promise<void> {
  const customers = listCustomers()
  const byId = new Map(customers.map((c) => [c.id, c]))
  const offset = await ledgerEnd()

  for (const c of customers) {
    const incoming = (await activeContracts(c.party, TRANSFER_INSTRUCTION)).filter(
      // Our own sweeps also show on the address, as outgoing offers. Only incoming ones are deposits.
      (i) => i.createArgument.transfer.receiver === c.party,
    )
    for (const i of incoming) {
      if (recordSeen(i, c, offset)) log('seen', c.ref, i.createArgument.transfer.amount, 'instr', short(i.contractId))
    }
  }

  // Each deposit advances on its own, so a slow one never delays detection or the others.
  for (const d of unfinishedDeposits()) {
    if (inFlight.has(d.instruction_cid)) continue
    const c = byId.get(d.customer_id)!
    inFlight.add(d.instruction_cid)
    advance(d.instruction_cid, c)
      .then((after) => {
        if (after.state !== d.state || after.error) {
          log(c.ref, d.state, '->', after.state, after.error ? `(attempt ${after.attempts}: ${after.error})` : '')
        }
      })
      .catch((e) => log(c.ref, 'advance crashed:', (e as Error).message.slice(0, 200)))
      .finally(() => inFlight.delete(d.instruction_cid))
  }
}

await reconcileCustomers()
log(`watching ${listCustomers().length} customer addresses every ${env.pollMs} ms`)
let backoff = env.pollMs
while (!stopping) {
  try {
    await tick()
    backoff = env.pollMs
  } catch (e) {
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
    log('poll failed, retrying in', backoff, 'ms:', (e as Error).message.slice(0, 200))
  }
  await sleep(backoff)
}
while (inFlight.size) await sleep(200)
log('stopped')

import { randomUUID } from 'node:crypto'
import { db } from './db.ts'
import { env } from './env.ts'
import { TRANSFER_INSTRUCTION, activeContracts, ledgerEnd } from './ledger.ts'
import { listCustomers, reconcileCustomers } from './customers.ts'
import { advance, recordSeen, unfinishedDeposits } from './deposits.ts'

// One pass of deposit work: record new incoming transfers and advance every unfinished deposit.
// Only one tick runs at a time, enforced by the 'tick' lease. A running tick renews it; a tick that dies releases it on expiry.
const LEASE_SECONDS = 55
const RENEW_MS = 15_000
// How long one tick keeps scanning for new deposits; well inside the 60 s serverless limit.
const DRAIN_BUDGET_MS = 30_000

export type TickEvent = { ref: string; from: string; to: string; error?: string }
export type TickResult = { ran: false } | { ran: true; seen: number; events: TickEvent[] }

export async function claim(holder: string): Promise<boolean> {
  const sql = await db()
  const rows = await sql`
    INSERT INTO lease (name, holder, until) VALUES ('tick', ${holder}, now() + make_interval(secs => ${LEASE_SECONDS}))
    ON CONFLICT (name) DO UPDATE SET holder = excluded.holder, until = excluded.until
    WHERE lease.until < now()
    RETURNING holder`
  return rows.length > 0
}

export async function renew(holder: string): Promise<boolean> {
  const sql = await db()
  const rows = await sql`
    UPDATE lease SET until = now() + make_interval(secs => ${LEASE_SECONDS})
    WHERE name = 'tick' AND holder = ${holder}
    RETURNING holder`
  return rows.length > 0
}

// Hold the lease for one poll interval after finishing, so back-to-back screen polls do not tick continuously.
async function release(holder: string): Promise<void> {
  const sql = await db()
  await sql`
    UPDATE lease SET until = now() + make_interval(secs => ${env.pollMs / 1000})
    WHERE name = 'tick' AND holder = ${holder}`
}

export async function tick(): Promise<TickResult> {
  const holder = randomUUID()
  if (!(await claim(holder))) return { ran: false }
  const renewing = setInterval(() => {
    renew(holder).then(
      (held) => held || console.error('tick lease lost to another holder'),
      (e) => console.error('tick lease renewal failed:', (e as Error).message),
    )
  }, RENEW_MS)
  try {
    return { ran: true, ...(await work()) }
  } finally {
    clearInterval(renewing)
    await release(holder)
  }
}

// Keeps scanning while earlier deposits are still advancing, and starts each new deposit as soon as it is seen,
// so a deposit that arrives mid-tick does not wait for the deposits ahead of it. Stops scanning once the budget is
// spent, then waits for every deposit it started, since a serverless function may be frozen after it responds.
export async function drain<D extends { instruction_cid: string }>(opts: {
  scan: () => Promise<number>
  pending: () => Promise<D[]>
  advance: (d: D) => Promise<void>
  budgetMs: number
  intervalMs: number
  now?: () => number
}): Promise<number> {
  const now = opts.now ?? Date.now
  const end = now() + opts.budgetMs
  const started = new Set<string>()
  const running = new Set<Promise<void>>()
  let seen = 0
  for (;;) {
    seen += await opts.scan()
    for (const d of await opts.pending()) {
      if (started.has(d.instruction_cid)) continue
      started.add(d.instruction_cid)
      const p: Promise<void> = opts.advance(d).finally(() => running.delete(p))
      running.add(p)
    }
    if (!running.size || now() >= end) break
    await Promise.race([Promise.allSettled([...running]), new Promise((r) => setTimeout(r, opts.intervalMs))])
  }
  await Promise.allSettled([...running])
  return seen
}

async function work(): Promise<{ seen: number; events: TickEvent[] }> {
  await reconcileCustomers()
  const customers = await listCustomers()
  const byId = new Map(customers.map((c) => [c.id, c]))

  // One unreadable address is logged and skipped, so it cannot hold up every other customer's deposits.
  const scan = async () => {
    const offset = await ledgerEnd()
    let seen = 0
    const scans = await Promise.allSettled(
      customers.map(async (c) => {
        const incoming = (await activeContracts(c.party, TRANSFER_INSTRUCTION)).filter(
          // Our own sweeps also show on the address, as outgoing offers. Only incoming ones are deposits.
          (i) => i.createArgument.transfer.receiver === c.party,
        )
        for (const i of incoming) if (await recordSeen(i, c, offset)) seen++
      }),
    )
    scans.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`scan of ${customers[i].ref} failed:`, (r.reason as Error).message.slice(0, 200))
    })
    return seen
  }

  const events: TickEvent[] = []
  const seen = await drain({
    scan,
    pending: unfinishedDeposits,
    advance: async (d) => {
      const c = byId.get(d.customer_id)!
      const after = await advance(d.instruction_cid, c)
      if (after.state !== d.state || after.error) {
        events.push({ ref: c.ref, from: d.state, to: after.state, ...(after.error ? { error: after.error } : {}) })
      }
    },
    budgetMs: DRAIN_BUDGET_MS,
    intervalMs: 2_000,
  })
  return { seen, events }
}

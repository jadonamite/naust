import { randomUUID } from 'node:crypto'
import { db } from './db.ts'
import { env } from './env.ts'
import { TRANSFER_INSTRUCTION, activeContracts, ledgerEnd } from './ledger.ts'
import { listCustomers, reconcileCustomers } from './customers.ts'
import { advance, recordSeen, unfinishedDeposits } from './deposits.ts'

// One pass of deposit work: record new incoming transfers and advance every unfinished deposit.
// Only one tick runs at a time, enforced by the 'tick' lease; a tick that dies releases it on expiry.
const LEASE_SECONDS = 55

export type TickEvent = { ref: string; from: string; to: string; error?: string }
export type TickResult = { ran: false } | { ran: true; seen: number; events: TickEvent[] }

async function claim(holder: string): Promise<boolean> {
  const sql = await db()
  const rows = await sql`
    INSERT INTO lease (name, holder, until) VALUES ('tick', ${holder}, now() + make_interval(secs => ${LEASE_SECONDS}))
    ON CONFLICT (name) DO UPDATE SET holder = excluded.holder, until = excluded.until
    WHERE lease.until < now()
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
  try {
    return { ran: true, ...(await work()) }
  } finally {
    await release(holder)
  }
}

async function work(): Promise<{ seen: number; events: TickEvent[] }> {
  await reconcileCustomers()
  const customers = await listCustomers()
  const byId = new Map(customers.map((c) => [c.id, c]))
  const offset = await ledgerEnd()

  let seen = 0
  await Promise.all(
    customers.map(async (c) => {
      const incoming = (await activeContracts(c.party, TRANSFER_INSTRUCTION)).filter(
        // Our own sweeps also show on the address, as outgoing offers. Only incoming ones are deposits.
        (i) => i.createArgument.transfer.receiver === c.party,
      )
      for (const i of incoming) if (await recordSeen(i, c, offset)) seen++
    }),
  )

  // Deposits advance concurrently; all finish before returning, since a serverless function may be frozen after it responds.
  const events: TickEvent[] = []
  await Promise.all(
    (await unfinishedDeposits()).map(async (d) => {
      const c = byId.get(d.customer_id)!
      const after = await advance(d.instruction_cid, c)
      if (after.state !== d.state || after.error) {
        events.push({ ref: c.ref, from: d.state, to: after.state, ...(after.error ? { error: after.error } : {}) })
      }
    }),
  )
  return { seen, events }
}

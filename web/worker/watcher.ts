// The deposit watcher for local runs: calls the same tick the deployed app uses, every NAUST_POLL_MS.
// Run with `npm run watch` from web/. On Vercel there is no loop; see lib/tick.ts for what triggers a tick there.
import { env } from '../lib/env.ts'
import { closeDb } from '../lib/db.ts'
import { listCustomers, reconcileCustomers } from '../lib/customers.ts'
import { tick } from '../lib/tick.ts'

const MAX_BACKOFF_MS = 30_000
let stopping = false
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => (stopping = true))

const log = (...args: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...args)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

await reconcileCustomers()
log(`watching ${(await listCustomers()).length} customer addresses every ${env.pollMs} ms`)
let backoff = env.pollMs
while (!stopping) {
  try {
    const r = await tick()
    if (r.ran) {
      if (r.seen) log('seen', r.seen, 'new deposit(s)')
      for (const e of r.events) log(e.ref, e.from, '->', e.to, e.error ? `(${e.error})` : '')
    }
    backoff = env.pollMs
  } catch (e) {
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
    log('poll failed, retrying in', backoff, 'ms:', (e as Error).message.slice(0, 200))
  }
  await sleep(backoff)
}
await closeDb()
log('stopped')

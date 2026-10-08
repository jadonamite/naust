// Runs the deposit tick every NAUST_POLL_MS. When PORT is set, also serves GET /healthz.
import { createServer } from 'node:http'
import { env } from '../lib/env.ts'
import { closeDb } from '../lib/db.ts'
import { listCustomers, reconcileCustomers } from '../lib/customers.ts'
import { tick } from '../lib/tick.ts'

const MAX_BACKOFF_MS = 30_000
// Healthy means a tick finished (or found another copy holding the lease) within this window.
const STALE_MS = 120_000
let stopping = false
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => (stopping = true))

const log = (...args: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...args)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const started = Date.now()
let lastOk = 0
let lastError: string | null = null

const server = process.env.PORT
  ? createServer((req, res) => {
      if (req.url !== '/healthz' && req.url !== '/') {
        res.writeHead(404).end()
        return
      }
      const age = lastOk ? Date.now() - lastOk : null
      const ok = age !== null ? age < STALE_MS : Date.now() - started < STALE_MS
      res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify({ ok, lastTickAgoMs: age, lastError }))
    }).listen(Number(process.env.PORT), () => log('health check on port', process.env.PORT))
  : undefined

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
    lastOk = Date.now()
    lastError = null
    backoff = env.pollMs
  } catch (e) {
    lastError = (e as Error).message.slice(0, 200)
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
    log('poll failed, retrying in', backoff, 'ms:', lastError)
  }
  await sleep(backoff)
}
server?.close()
await closeDb()
log('stopped')

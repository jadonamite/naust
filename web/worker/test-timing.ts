// SC-002: time from ledger commit to "matched" (attributed to a customer) and to "swept", over 10 deposits.
// The send call returns after the transfer commits, so its return time stands in for the commit time.
import { spawn, execFileSync } from 'node:child_process'
import { listDeposits } from '../lib/deposits.ts'

const N = 10
const BOUND_S = 15
const refs = ['Ada', 'Ben', 'Tokunbo']
const node = ['--disable-warning=ExperimentalWarning']
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const watcher = spawn('node', [...node, 'worker/watcher.ts'], { stdio: 'ignore' })
process.on('exit', () => watcher.kill('SIGTERM'))
await sleep(4_000)
const known = new Set(listDeposits().map((d) => d.instruction_cid))

const committed: { ref: string; at: number }[] = []
for (let i = 0; i < N; i++) {
  const ref = refs[i % refs.length]
  execFileSync('node', [...node, 'worker/send-deposit.ts', ref, '0.1'], { stdio: ['ignore', 'ignore', 'inherit'] })
  committed.push({ ref, at: Date.now() })
  await sleep(2_000)
}

const ours = () => listDeposits().filter((d) => !known.has(d.instruction_cid)).sort((a, b) => a.seen_at.localeCompare(b.seen_at))
const deadline = Date.now() + 120_000
while (Date.now() < deadline && !(ours().length === N && ours().every((d) => d.state === 'swept' || d.state === 'failed'))) {
  await sleep(1_000)
}
watcher.kill('SIGTERM')

const rows = ours().map((d, i) => ({
  customer: committed[i]?.ref,
  matched_s: (Date.parse(d.seen_at) - committed[i].at) / 1000,
  swept_s: (Date.parse(d.updated_at) - committed[i].at) / 1000,
  state: d.state,
}))
console.table(rows)
const matched = rows.map((r) => r.matched_s).sort((a, b) => a - b)
const swept = rows.map((r) => r.swept_s).sort((a, b) => a - b)
const pct = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.floor((xs.length * p) / 100))]
console.log(`matched: median ${pct(matched, 50)}s, max ${matched.at(-1)}s · swept: median ${pct(swept, 50)}s, max ${swept.at(-1)}s`)
const ok = rows.length === N && matched.at(-1)! <= BOUND_S
console.log(ok ? 'PASS' : 'FAIL', `all ${N} matched within ${BOUND_S}s`)
process.exit(ok ? 0 : 1)

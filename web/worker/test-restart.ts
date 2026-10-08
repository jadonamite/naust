// SC-003: kill the watcher mid-deposit several times, restart it, and check nothing is credited twice or missed.
// Sends from the treasury wallet, so a correct run leaves the treasury balance unchanged.
import { spawn, execFileSync, type ChildProcess } from 'node:child_process'
import { AMULET, TRANSFER_INSTRUCTION, activeContracts, amuletBalance, treasuryParty } from '../lib/ledger.ts'
import { listCustomers } from '../lib/customers.ts'
import { listDeposits } from '../lib/deposits.ts'

const KILL_AFTER_MS = [4_000, 9_000, 15_000, 22_000]
const FINISH_TIMEOUT_MS = 180_000
const sends: [string, string][] = [['Ada', '1.5'], ['Ben', '2.5'], ['Tokunbo', '1.0']]
const node = ['--disable-warning=ExperimentalWarning']
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const treasury = await treasuryParty()
const balance = async () => amuletBalance((await activeContracts(treasury, AMULET)).filter((c) => c.createArgument.owner === treasury))
const before = await balance()
const known = new Set(listDeposits().map((d) => d.instruction_cid))

for (const [ref, amount] of sends) {
  console.log(execFileSync('node', [...node, 'worker/send-deposit.ts', ref, amount]).toString().trim())
}

let watcher: ChildProcess | undefined
process.on('exit', () => watcher?.kill('SIGTERM'))
const start = () => {
  watcher = spawn('node', [...node, 'worker/watcher.ts'], { stdio: ['ignore', 'pipe', 'pipe'] })
  watcher.stdout!.on('data', (b) => process.stdout.write('  watcher ' + b))
  watcher.stderr!.on('data', (b) => process.stdout.write('  watcher! ' + b))
}

start()
let elapsed = 0
for (const at of KILL_AFTER_MS) {
  await sleep(at - elapsed)
  elapsed = at
  watcher!.kill('SIGKILL')
  console.log(`-- killed at ${at / 1000}s, restarting`)
  await sleep(500)
  start()
}

const ours = () => listDeposits().filter((d) => !known.has(d.instruction_cid))
const deadline = Date.now() + FINISH_TIMEOUT_MS
while (Date.now() < deadline && !(ours().length === sends.length && ours().every((d) => d.state === 'swept' || d.state === 'failed'))) {
  await sleep(1_000)
}
watcher!.kill('SIGTERM')
await sleep(1_000)

let failures = 0
const check = (ok: boolean, msg: string) => (console.log(ok ? 'PASS' : 'FAIL', msg), ok || failures++)
const deposits = ours()
check(deposits.length === sends.length, `${deposits.length} of ${sends.length} deposits recorded`)
check(deposits.every((d) => d.state === 'swept'), `all swept (${deposits.map((d) => d.state).join(', ')})`)

const receipts = await activeContracts(treasury, ':Naust:DepositReceipt')
for (const d of deposits) {
  const n = receipts.filter((r) => r.createArgument.sourceInstructionCid === d.instruction_cid).length
  check(n === 1, `exactly one receipt for ${d.amount} CC (found ${n})`)
}
for (const c of listCustomers()) {
  const acs = await activeContracts(c.party)
  check(amuletBalance(acs.filter((x) => x.createArgument.owner === c.party)) === 0, `${c.ref} address holds nothing`)
  check(!acs.some((x) => x.templateId.endsWith(TRANSFER_INSTRUCTION)), `${c.ref} has no pending transfers`)
}
const delta = (await balance()) - before
check(Math.abs(delta) < 1e-9, `treasury net change is zero (${delta})`)
process.exit(failures ? 1 : 0)

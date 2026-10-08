// SC-004 on DevNet: each customer address sees only its own receipts; the business sees all of them.
import { activeContracts, treasuryParty } from '../lib/ledger.ts'
import { listCustomers } from '../lib/customers.ts'
import { listDeposits } from '../lib/deposits.ts'

const business = await treasuryParty()
const customers = listCustomers()
let failures = 0
const check = (ok: boolean, msg: string) => {
  console.log(ok ? 'PASS' : 'FAIL', msg)
  if (!ok) failures++
}

const all = await activeContracts(business, ':Naust:DepositReceipt')
const swept = listDeposits().filter((d) => d.state === 'swept')
check(swept.every((d) => all.some((r) => r.createArgument.sourceInstructionCid === d.instruction_cid)),
  `business sees a receipt for each of ${swept.length} swept deposits`)

for (const c of customers) {
  const seen = await activeContracts(c.party, ':Naust:DepositReceipt')
  const own = all.filter((r) => r.createArgument.customer === c.party)
  check(seen.every((r) => r.createArgument.customer === c.party), `${c.ref} sees no other customer's receipt`)
  check(seen.length === own.length, `${c.ref} sees all ${own.length} of its own receipts`)
  check(seen.every((r) => r.createArgument.sweepUpdateId), `${c.ref}'s receipts all record their sweep`)
}

process.exit(failures ? 1 : 0)

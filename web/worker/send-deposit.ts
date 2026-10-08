// Sends a test deposit: a plain token-standard transfer with no memo, as an exchange withdrawal would be.
// Usage: node worker/send-deposit.ts <customer-ref> <amount>   send from the Exchange party
//        node worker/send-deposit.ts --fund <amount>           move CC from the treasury wallet to Exchange
// Falls back to the treasury wallet when no Exchange party exists.
import { env } from '../lib/env.ts'
import { ledgerUserId } from '../lib/auth.ts'
import { AMULET, TRANSFER_INSTRUCTION, activeContracts, amuletBalance, call, treasuryParty } from '../lib/ledger.ts'
import { acceptInstruction, transfer } from '../lib/registry.ts'
import { listCustomers } from '../lib/customers.ts'
import { closeDb } from '../lib/db.ts'

const [first, second] = process.argv.slice(2)
const treasury = await treasuryParty()
const exchange = `${(await ledgerUserId()).split('-')[0]}-Exchange::${treasury.split('::')[1]}`

async function exchangeHoldings() {
  try {
    return (await activeContracts(exchange, AMULET)).filter((c) => c.createArgument.owner === exchange)
  } catch {
    return undefined // party missing or no rights on it
  }
}

// The validator wallet acts for the treasury, the same call any wallet UI makes.
// Retries because the wallet's own coin-merging can race a send for the same input coin.
async function sendFromWallet(receiver: string, amount: string, attempt = 1): Promise<string> {
  try {
    const res = await call(env.validatorApi + '/wallet/token-standard/transfers', {
      receiver_party_id: receiver,
      amount,
      description: '',
      expires_at: (Date.now() + 86_400_000) * 1000,
      tracking_id: 'naust-demo-' + Date.now(),
    })
    return res.output.transfer_instruction_cid
  } catch (e) {
    if (attempt >= 3) throw e
    console.error(`send attempt ${attempt} failed, retrying: ${(e as Error).message.slice(0, 300)}`)
    await new Promise((r) => setTimeout(r, 2_000 * attempt))
    return sendFromWallet(receiver, amount, attempt + 1)
  }
}

if (first === '--fund') {
  const cid = await sendFromWallet(exchange, second)
  await acceptInstruction(cid, exchange)
  console.log('funded Exchange with', second, 'CC; balance', amuletBalance((await exchangeHoldings()) ?? []))
} else {
  const customer = (await listCustomers()).find((c) => c.ref === first)
  if (!customer || !second) throw new Error('usage: send-deposit.ts <customer-ref> <amount> | --fund <amount>')
  const holdings = await exchangeHoldings()
  if (holdings?.length && amuletBalance(holdings) >= Number(second)) {
    const { tx } = await transfer({ sender: exchange, receiver: customer.party, holdings, amount: second })
    const instr = tx.events.map((e: any) => e.CreatedEvent).find((e: any) => e?.templateId.endsWith(TRANSFER_INSTRUCTION))
    console.log('Exchange sent', second, 'CC to', customer.ref, 'instr', instr?.contractId.slice(0, 12))
  } else {
    const cid = await sendFromWallet(customer.party, second)
    console.log('treasury wallet sent', second, 'CC to', customer.ref, '(no funded Exchange party) instr', cid.slice(0, 12))
  }
}
await closeDb()

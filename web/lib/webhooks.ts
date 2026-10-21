import { createHmac } from 'node:crypto'
import { businessById } from './businesses.ts'
import { instrumentIdentity } from './instrument.ts'
import type { Customer, Deposit } from './db.ts'

export type DepositSwept = {
  event: 'deposit.swept'
  businessId: string
  customerRef: string
  customerParty: string
  amount: string
  instrumentId: string
  instrumentAdmin: string | null
  sender: string
  sourceInstructionCid: string
  acceptUpdateId: string | null
  receiptCid: string | null
  sweepUpdateId: string | null
}

// Hex HMAC-SHA256 of the exact request body, sent as `x-naust-signature: sha256=<hex>`.
export function sign(body: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

export function sweptEvent(d: Deposit, c: Customer): DepositSwept {
  return {
    event: 'deposit.swept',
    businessId: d.business_id,
    customerRef: c.ref,
    customerParty: c.party,
    amount: d.amount,
    ...instrumentIdentity(d.instrument),
    sender: d.sender,
    sourceInstructionCid: d.instruction_cid,
    acceptUpdateId: d.accept_update_id,
    receiptCid: d.receipt_cid,
    sweepUpdateId: d.sweep_update_id,
  }
}

// Tells the business a deposit reached its treasury. Best effort: a failed post is logged, never fails the deposit;
// the receiving app can always read the receipt from the ledger instead.
export async function notifySwept(d: Deposit, c: Customer): Promise<void> {
  const business = await businessById(d.business_id)
  if (!business?.webhook_url || !business.webhook_secret) return
  const body = JSON.stringify(sweptEvent(d, c))
  try {
    const res = await fetch(business.webhook_url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-naust-signature': sign(body, business.webhook_secret) },
      body,
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) console.error(`webhook for ${c.ref} returned ${res.status}`)
  } catch (e) {
    console.error(`webhook for ${c.ref} failed:`, (e as Error).message.slice(0, 200))
  }
}

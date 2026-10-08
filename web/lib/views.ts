import type { Customer, Deposit } from './db.ts'
import { listCustomers } from './customers.ts'
import { listDeposits } from './deposits.ts'
import { AMULET, activeContracts, amuletBalance, treasuryParty, type CreatedEvent } from './ledger.ts'
import { partyName, senderName } from './party.ts'

// JSON shapes the screens read. Party IDs stay whole; `label` is the readable name (see lib/party.ts).
export const label = partyName

export type CustomerView = {
  id: string
  ref: string
  address: string
  label: string
  accountCid: string | null
  createdAt: string
  deposits: number
  received: string
  lastDepositAt: string | null
}

export type DepositView = {
  id: string
  customerId: string
  customerRef: string
  amount: string
  instrument: string
  sender: string
  senderLabel: string
  state: Deposit['state']
  error: string | null
  seenAt: string
  updatedAt: string
  acceptUpdateId: string | null
  sweepUpdateId: string | null
  receiptCid: string | null
}

export type ReceiptView = {
  cid: string
  customerRef: string
  amount: string
  instrumentId: string
  sender: string
  senderLabel: string
  receivedAt: string
  acceptUpdateId: string
  sweepUpdateId: string | null
}

const sum = (xs: string[]) => xs.reduce((s, x) => s + Number(x), 0).toFixed(10)

export async function customerViews(): Promise<CustomerView[]> {
  const [deposits, customers] = await Promise.all([listDeposits(), listCustomers()])
  return customers.map((c) => {
    const own = deposits.filter((d) => d.customer_id === c.id)
    return {
      id: c.id,
      ref: c.ref,
      address: c.party,
      label: label(c.party),
      accountCid: c.account_cid,
      createdAt: c.created_at,
      deposits: own.length,
      received: sum(own.filter((d) => d.state === 'swept').map((d) => d.amount)),
      lastDepositAt: own[0]?.seen_at ?? null,
    }
  })
}

export async function depositViews(customerId?: string): Promise<DepositView[]> {
  const [customers, deposits] = await Promise.all([listCustomers(), listDeposits(customerId)])
  const refs = new Map(customers.map((c) => [c.id, c.ref]))
  return deposits.map((d) => ({
    id: d.instruction_cid,
    customerId: d.customer_id,
    customerRef: refs.get(d.customer_id) ?? '',
    amount: d.amount,
    instrument: d.instrument.slice(0, d.instrument.indexOf('@')),
    sender: d.sender,
    senderLabel: senderName(d.sender),
    state: d.state,
    error: d.error,
    seenAt: d.seen_at,
    updatedAt: d.updated_at,
    acceptUpdateId: d.accept_update_id,
    sweepUpdateId: d.sweep_update_id,
    receiptCid: d.receipt_cid,
  }))
}

export async function treasuryView(): Promise<{ party: string; label: string; balance: string }> {
  const party = await treasuryParty()
  const holdings = (await activeContracts(party, AMULET)).filter((c) => c.createArgument.owner === party)
  return { party, label: label(party), balance: amuletBalance(holdings).toFixed(10) }
}

// Read as the customer's own address party, so the ledger, not this code, decides what is visible (SC-004).
export async function receiptViews(customer: Customer): Promise<ReceiptView[]> {
  const receipts: CreatedEvent[] = await activeContracts(customer.party, ':Naust:DepositReceipt')
  return receipts
    .map((r) => {
      const a = r.createArgument
      return {
        cid: r.contractId,
        customerRef: a.customerRef,
        amount: a.amount,
        instrumentId: a.instrumentId,
        sender: a.sender,
        senderLabel: senderName(a.sender),
        receivedAt: a.receivedAt,
        acceptUpdateId: a.acceptUpdateId,
        sweepUpdateId: a.sweepUpdateId ?? null,
      }
    })
    .sort((x, y) => y.receivedAt.localeCompare(x.receivedAt))
}

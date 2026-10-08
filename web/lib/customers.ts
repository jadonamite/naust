import { randomUUID } from 'node:crypto'
import { db, type Customer } from './db.ts'
import { ledgerUserId } from './auth.ts'
import { activeContracts, createdIn, submit, treasuryParty } from './ledger.ts'

// Customer addresses come from a pool of Console-created parties (API allocation is denied on the shared node).
export const CUSTOMER_ACCOUNT = '#naust:Naust:CustomerAccount'
const POOL_NAMES = (process.env.NAUST_POOL ?? 'Ada,Ben,Tokunbo').split(',').map((s) => s.trim()).filter(Boolean)

export async function poolParties(): Promise<string[]> {
  const prefix = (await ledgerUserId()).split('-')[0]
  const ns = (await treasuryParty()).split('::')[1]
  return POOL_NAMES.map((name) => `${prefix}-${name}::${ns}`)
}

export function listCustomers(): Customer[] {
  return db().prepare('SELECT * FROM customers ORDER BY created_at').all() as Customer[]
}

export function customerById(id: string): Customer | undefined {
  return db().prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer | undefined
}

// Accepts either the customer ID or the business's own reference (used in readable links like /customer/Ada).
export function findCustomer(idOrRef: string): Customer | undefined {
  return customerById(idOrRef) ?? (db().prepare('SELECT * FROM customers WHERE ref = ?').get(idOrRef) as Customer | undefined)
}

export function customerByParty(party: string): Customer | undefined {
  return db().prepare('SELECT * FROM customers WHERE party = ?').get(party) as Customer | undefined
}

export class PoolExhaustedError extends Error {}
export class DuplicateRefError extends Error {}

// Reserve the next free pool address in SQLite, then create the CustomerAccount on the ledger.
export async function createCustomer(ref: string): Promise<Customer> {
  ref = ref.trim()
  if (!ref) throw new Error('customer reference is required')
  if (db().prepare('SELECT 1 FROM customers WHERE ref = ?').get(ref)) throw new DuplicateRefError(`reference ${ref} exists`)
  const taken = new Set(listCustomers().map((c) => c.party))
  const party = (await poolParties()).find((p) => !taken.has(p))
  if (!party) throw new PoolExhaustedError('no free deposit address left in the pool')

  const id = 'cus_' + randomUUID().replaceAll('-', '').slice(0, 16)
  db()
    .prepare('INSERT INTO customers (id, party, ref, account_cid, created_at) VALUES (?, ?, ?, NULL, ?)')
    .run(id, party, ref, new Date().toISOString())
  await ensureAccount(customerById(id)!)
  return customerById(id)!
}

async function ensureAccount(c: Customer): Promise<void> {
  const business = await treasuryParty()
  const existing = (await activeContracts(c.party, ':Naust:CustomerAccount')).find(
    (a) => a.createArgument.business === business && a.createArgument.customer === c.party,
  )
  let cid = existing?.contractId
  if (!cid) {
    const tx = await submit({
      actAs: business,
      commandId: 'naust-account-' + c.id,
      command: {
        CreateCommand: {
          templateId: CUSTOMER_ACCOUNT,
          createArguments: { business, customer: c.party, customerRef: c.ref, createdAt: c.created_at },
        },
      },
    })
    cid = createdIn(tx).find((e) => e.templateId.endsWith(':Naust:CustomerAccount'))!.contractId
  }
  db().prepare('UPDATE customers SET account_cid = ? WHERE id = ?').run(cid, c.id)
}

// Finish any customer whose ledger account was interrupted by a crash.
export async function reconcileCustomers(): Promise<void> {
  for (const c of listCustomers()) {
    if (!c.account_cid) await ensureAccount(c)
  }
}

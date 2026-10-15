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

// Every business's customers when no business is given (the tick watches them all).
export async function listCustomers(businessId?: string): Promise<Customer[]> {
  const sql = await db()
  return businessId
    ? await sql<Customer[]>`SELECT * FROM customers WHERE business_id = ${businessId} ORDER BY created_at`
    : await sql<Customer[]>`SELECT * FROM customers ORDER BY created_at`
}

export async function customerById(id: string): Promise<Customer | undefined> {
  const sql = await db()
  const [c] = await sql<Customer[]>`SELECT * FROM customers WHERE id = ${id}`
  return c
}

// A customer of one business, by ID or by the business's own reference (readable links like /customer/Ada).
export async function findCustomer(businessId: string, idOrRef: string): Promise<Customer | undefined> {
  const sql = await db()
  const [c] = await sql<Customer[]>`
    SELECT * FROM customers WHERE business_id = ${businessId} AND (id = ${idOrRef} OR ref = ${idOrRef})
    ORDER BY (id = ${idOrRef}) DESC LIMIT 1`
  return c
}

export async function customerByParty(party: string): Promise<Customer | undefined> {
  const sql = await db()
  const [c] = await sql<Customer[]>`SELECT * FROM customers WHERE party = ${party}`
  return c
}

export class PoolExhaustedError extends Error {}
export class DuplicateRefError extends Error {}

// Reserve the next free pool address in Postgres, then create the CustomerAccount on the ledger.
export async function createCustomer(businessId: string, ref: string): Promise<Customer> {
  ref = ref.trim()
  if (!ref) throw new Error('customer reference is required')
  const sql = await db()
  if ((await sql`SELECT 1 FROM customers WHERE business_id = ${businessId} AND ref = ${ref}`).length) {
    throw new DuplicateRefError(`reference ${ref} exists`)
  }
  const taken = new Set((await listCustomers()).map((c) => c.party))
  const party = (await poolParties()).find((p) => !taken.has(p))
  if (!party) throw new PoolExhaustedError('no free deposit address left in the pool')

  const id = 'cus_' + randomUUID().replaceAll('-', '').slice(0, 16)
  await sql`
    INSERT INTO customers (id, business_id, party, ref, account_cid, created_at)
    VALUES (${id}, ${businessId}, ${party}, ${ref}, NULL, ${new Date().toISOString()})`
  await ensureAccount((await customerById(id))!)
  return (await customerById(id))!
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
  const sql = await db()
  await sql`UPDATE customers SET account_cid = ${cid!} WHERE id = ${c.id}`
}

// Finish any customer whose ledger account was interrupted by a crash.
export async function reconcileCustomers(): Promise<void> {
  for (const c of await listCustomers()) {
    if (!c.account_cid) await ensureAccount(c)
  }
}

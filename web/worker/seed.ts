// Create one customer per pool address. Usage: node worker/seed.ts Ada Ben Tokunbo
import { createCustomer, listCustomers } from '../lib/customers.ts'

const existing = new Set(listCustomers().map((c) => c.ref))
for (const ref of process.argv.slice(2)) {
  if (existing.has(ref)) continue
  const c = await createCustomer(ref)
  console.log(c.ref, c.id, c.party.split('::')[0], 'account', c.account_cid?.slice(0, 12))
}
console.table(listCustomers().map((c) => ({ ref: c.ref, id: c.id, address: c.party.split('::')[0] })))

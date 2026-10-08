// One-off copy of the old SQLite file into Postgres: customers first, then deposits. Rows already present are
// skipped, so running it twice changes nothing. Usage: node worker/migrate-sqlite.ts [path/to/naust.db]
import { DatabaseSync } from 'node:sqlite'
import { closeDb, db, type Customer, type Deposit } from '../lib/db.ts'

const file = process.argv[2] ?? 'data/naust.db'
const old = new DatabaseSync(file, { readOnly: true })
const customers = old.prepare('SELECT * FROM customers ORDER BY created_at').all() as unknown as Customer[]
const deposits = old.prepare('SELECT * FROM deposits ORDER BY seen_at').all() as unknown as Deposit[]
old.close()

const sql = await db()
const plain = <T extends object>(rows: T[]) => rows.map((r) => ({ ...r }))
const c = customers.length ? await sql`INSERT INTO customers ${sql(plain(customers))} ON CONFLICT DO NOTHING` : { count: 0 }
const d = deposits.length ? await sql`INSERT INTO deposits ${sql(plain(deposits))} ON CONFLICT DO NOTHING` : { count: 0 }
console.log(`customers: ${c.count} of ${customers.length} copied; deposits: ${d.count} of ${deposits.length} copied`)
await closeDb()

import postgres from 'postgres'
import { env } from './env.ts'

// Off-ledger state shared by the Next.js app and the tick. The ledger stays the source of truth for receipts.
export const DEPOSIT_STATES = ['seen', 'accepted', 'receipted', 'sweeping', 'swept', 'failed'] as const
export type DepositState = (typeof DEPOSIT_STATES)[number]

export type Customer = { id: string; party: string; ref: string; account_cid: string | null; created_at: string }

export type Deposit = {
  instruction_cid: string
  customer_id: string
  amount: string
  instrument: string
  sender: string
  state: DepositState
  accept_update_id: string | null
  receipt_cid: string | null
  holding_cid: string | null
  sweep_instruction_cid: string | null
  sweep_update_id: string | null
  seen_offset: number
  error: string | null
  attempts: number
  next_attempt_at: Date | null
  seen_at: string
  updated_at: string
}

// Each entry runs once, in order; schema_version records how many have run. Timestamps are ISO-8601 text.
export const migrations = [
  `CREATE TABLE customers (
     id TEXT PRIMARY KEY,
     party TEXT NOT NULL UNIQUE,
     ref TEXT NOT NULL UNIQUE,
     account_cid TEXT,
     created_at TEXT NOT NULL
   );
   CREATE TABLE deposits (
     instruction_cid TEXT PRIMARY KEY,
     customer_id TEXT NOT NULL REFERENCES customers(id),
     amount TEXT NOT NULL,
     instrument TEXT NOT NULL,
     sender TEXT NOT NULL,
     state TEXT NOT NULL CHECK (state IN ('seen','accepted','receipted','sweeping','swept','failed')),
     accept_update_id TEXT,
     receipt_cid TEXT,
     holding_cid TEXT,
     sweep_instruction_cid TEXT,
     sweep_update_id TEXT,
     seen_offset BIGINT NOT NULL,
     error TEXT,
     attempts INTEGER NOT NULL DEFAULT 0,
     seen_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE INDEX deposits_customer_seen ON deposits(customer_id, seen_at);
   CREATE INDEX deposits_state ON deposits(state);
   -- One row per named lease; a tick runs only while it holds the 'tick' lease (see lib/tick.ts).
   CREATE TABLE lease (
     name TEXT PRIMARY KEY,
     holder TEXT NOT NULL,
     until TIMESTAMPTZ NOT NULL
   );`,
  // Amounts become exact decimals; next_attempt_at spaces out retries after an error.
  `ALTER TABLE deposits ALTER COLUMN amount TYPE NUMERIC(38,10) USING amount::numeric;
   ALTER TABLE deposits ADD COLUMN next_attempt_at TIMESTAMPTZ;`,
]

export type Sql = postgres.Sql<{ bigint: number }>

let instance: Sql | undefined
let ready: Promise<Sql> | undefined

async function migrate(sql: Sql): Promise<void> {
  await sql.begin(async (tx) => {
    // Two cold starts migrating at once would collide; the lock makes the second wait for the first.
    await tx`SELECT pg_advisory_xact_lock(7461001)`
    await tx`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`
    const [row] = await tx<{ version: number }[]>`SELECT version FROM schema_version`
    const from = row?.version ?? 0
    for (let i = from; i < migrations.length; i++) await tx.unsafe(migrations[i]).simple()
    if (!row) await tx`INSERT INTO schema_version (version) VALUES (${migrations.length})`
    else if (from < migrations.length) await tx`UPDATE schema_version SET version = ${migrations.length}`
  })
}

export function db(): Promise<Sql> {
  if (ready) return ready
  instance = postgres(env.databaseUrl, {
    // Serverless functions open many short-lived copies; keep each one's pool small.
    max: 5,
    idle_timeout: 20,
    // Neon's pooled endpoint runs PgBouncer in transaction mode, which cannot hold prepared statements.
    prepare: false,
    onnotice: () => {},
    // BIGINT (type 20) comes back as a string by default; ledger offsets fit comfortably in a JS number.
    types: { bigint: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) } },
  }) as Sql
  ready = migrate(instance).then(
    () => instance!,
    (e) => {
      ready = undefined
      throw e
    },
  )
  return ready
}

// Close the pool so one-off scripts can exit.
export async function closeDb(): Promise<void> {
  if (!instance) return
  await instance.end({ timeout: 5 })
  instance = undefined
  ready = undefined
}

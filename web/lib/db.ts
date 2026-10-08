import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { env } from './env.ts'

// Off-ledger state shared by the Next.js app and the watcher process. The ledger stays the source of truth for receipts.
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
  seen_at: string
  updated_at: string
}

// Each entry runs once, in order; PRAGMA user_version records how many have run.
const migrations = [
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
     seen_offset INTEGER NOT NULL,
     error TEXT,
     attempts INTEGER NOT NULL DEFAULT 0,
     seen_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE INDEX deposits_customer_seen ON deposits(customer_id, seen_at);
   CREATE INDEX deposits_state ON deposits(state);`,
]

let instance: DatabaseSync | undefined

export function db(): DatabaseSync {
  if (instance) return instance
  mkdirSync(dirname(env.dbPath), { recursive: true })
  const d = new DatabaseSync(env.dbPath)
  // WAL lets the app read while the watcher writes; busy_timeout waits out brief locks between the two processes.
  d.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;')
  const { user_version } = d.prepare('PRAGMA user_version').get() as { user_version: number }
  for (let i = user_version; i < migrations.length; i++) {
    d.exec('BEGIN')
    try {
      d.exec(migrations[i])
      d.exec(`PRAGMA user_version = ${i + 1}`)
      d.exec('COMMIT')
    } catch (e) {
      d.exec('ROLLBACK')
      throw e
    }
  }
  instance = d
  return d
}

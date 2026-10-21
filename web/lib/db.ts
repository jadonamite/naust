import postgres from 'postgres'
import { env } from './env.ts'

// Off-ledger state shared by the Next.js app and the tick. The ledger stays the source of truth for receipts.
export const DEPOSIT_STATES = ['seen', 'accepted', 'receipted', 'sweeping', 'swept', 'failed'] as const
export type DepositState = (typeof DEPOSIT_STATES)[number]

export type Customer = {
  id: string
  business_id: string
  party: string
  ref: string
  account_cid: string | null
  created_at: string
}

export type Business = {
  id: string
  name: string
  is_demo: boolean
  created_at: Date
  // The business's own treasury party; null means the node's primary party.
  treasury_party: string | null
  // Where Naust posts each completed deposit, and the key that signs it.
  webhook_url: string | null
  webhook_secret: string | null
  // Set for businesses shown read-only at /operator?op=<slug>.
  public_slug: string | null
}
export type Role = 'owner' | 'member'

export type Deposit = {
  instruction_cid: string
  business_id: string
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
  dismissed_at: Date | null
  dismissed_by: string | null
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
  // Accounts (tables as Better Auth expects them, see lib/accounts.ts), businesses and their members,
  // customer sign-in by invite. Existing customers and deposits become the demo business's.
  `create table "auth_user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null, "ageCheck" text);
   create table "auth_session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "auth_user" ("id") on delete cascade);
   create table "auth_account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "auth_user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);
   create table "auth_verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);
   create table "auth_rate_limit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);
   create index "auth_session_userId_idx" on "auth_session" ("userId");
   create index "auth_account_userId_idx" on "auth_account" ("userId");
   create index "auth_verification_identifier_idx" on "auth_verification" ("identifier");
   CREATE TABLE businesses (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     is_demo BOOLEAN NOT NULL DEFAULT false,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   CREATE UNIQUE INDEX businesses_one_demo ON businesses (is_demo) WHERE is_demo;
   CREATE TABLE business_members (
     business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
     user_id TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
     role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (business_id, user_id)
   );
   CREATE INDEX business_members_user ON business_members(user_id);
   INSERT INTO businesses (id, name, is_demo) SELECT 'biz_demo', 'MagnaXchange', true WHERE EXISTS (SELECT 1 FROM customers);
   ALTER TABLE customers ADD COLUMN business_id TEXT REFERENCES businesses(id);
   ALTER TABLE deposits ADD COLUMN business_id TEXT REFERENCES businesses(id);
   UPDATE customers SET business_id = 'biz_demo';
   UPDATE deposits SET business_id = 'biz_demo';
   ALTER TABLE customers ALTER COLUMN business_id SET NOT NULL;
   ALTER TABLE deposits ALTER COLUMN business_id SET NOT NULL;
   ALTER TABLE customers DROP CONSTRAINT customers_ref_key;
   ALTER TABLE customers ADD CONSTRAINT customers_business_ref UNIQUE (business_id, ref);
   CREATE INDEX deposits_business_seen ON deposits(business_id, seen_at);
   ALTER TABLE deposits ADD COLUMN dismissed_at TIMESTAMPTZ;
   ALTER TABLE deposits ADD COLUMN dismissed_by TEXT REFERENCES auth_user(id) ON DELETE SET NULL;
   CREATE TABLE customer_users (
     customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
     user_id TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (customer_id, user_id)
   );
   CREATE INDEX customer_users_user ON customer_users(user_id);
   -- Only a hash of each invite token is stored; the link itself is shown once.
   CREATE TABLE customer_invites (
     token_hash TEXT PRIMARY KEY,
     customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
     created_by TEXT REFERENCES auth_user(id) ON DELETE SET NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     expires_at TIMESTAMPTZ NOT NULL,
     used_at TIMESTAMPTZ,
     used_by TEXT REFERENCES auth_user(id) ON DELETE SET NULL
   );`,
  `ALTER TABLE businesses ADD COLUMN treasury_party TEXT;
   ALTER TABLE businesses ADD COLUMN webhook_url TEXT;
   ALTER TABLE businesses ADD COLUMN webhook_secret TEXT;`,
  `ALTER TABLE businesses ADD COLUMN public_slug TEXT UNIQUE;
   UPDATE businesses SET public_slug = 'magnaxchange' WHERE is_demo;`,
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

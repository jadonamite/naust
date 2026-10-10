// Needs a throwaway Postgres: DATABASE_URL must name a database with "test" in it. Skips otherwise.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import postgres from 'postgres'

const url = process.env.DATABASE_URL ?? ''
const skip = !/\/[^/]*test[^/]*$/.test(url) && 'set DATABASE_URL to a test database'

const { db, closeDb, migrations } = await import('../lib/db.ts')
const { unfinishedDeposits, retryDeposit, depositById } = await import('../lib/deposits.ts')
const { claim, renew } = await import('../lib/tick.ts')

before(async () => {
  if (skip) return
  // Start from the schema production has today: version 1, amounts stored as text.
  const raw = postgres(url, { onnotice: () => {} })
  await raw.unsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  await raw.unsafe(migrations[0]).simple()
  await raw.unsafe(`
    CREATE TABLE schema_version (version INTEGER NOT NULL);
    INSERT INTO schema_version VALUES (1);
    INSERT INTO customers VALUES ('cus_a', 'party-a', 'Ada', 'acct', '2026-10-01T00:00:00.000Z');
    INSERT INTO deposits (instruction_cid, customer_id, amount, instrument, sender, state, seen_offset, seen_at, updated_at)
    VALUES ('d1', 'cus_a', '5.5', 'Amulet@DSO', 'Exchange', 'seen', 1, '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z'),
           ('d2', 'cus_a', '0.0000000001', 'Amulet@DSO', 'Exchange', 'seen', 1, '2026-10-01T00:00:01Z', '2026-10-01T00:00:01Z');`)
  await raw.end()
})

after(() => closeDb())

test('migration keeps existing amounts and makes them exact', { skip }, async () => {
  const sql = await db()
  const [{ version }] = await sql<{ version: number }[]>`SELECT version FROM schema_version`
  assert.equal(version, migrations.length)
  const rows = await sql<{ amount: string }[]>`SELECT amount FROM deposits ORDER BY instruction_cid`
  assert.deepEqual(rows.map((r) => r.amount), ['5.5000000000', '0.0000000001'])
  const [{ total }] = await sql<{ total: string }[]>`SELECT sum(amount)::text AS total FROM deposits`
  assert.equal(total, '5.5000000001')
})

test('a deposit waiting to retry is left alone until its time', { skip }, async () => {
  const sql = await db()
  await sql`UPDATE deposits SET next_attempt_at = now() + interval '1 minute' WHERE instruction_cid = 'd1'`
  await sql`UPDATE deposits SET next_attempt_at = now() - interval '1 second' WHERE instruction_cid = 'd2'`
  assert.deepEqual((await unfinishedDeposits()).map((d) => d.instruction_cid), ['d2'])
})

test('retry sends a failed deposit back to the step it reached', { skip }, async () => {
  const sql = await db()
  await sql`UPDATE deposits SET state = 'failed', accept_update_id = 'u1', holding_cid = 'h1', receipt_cid = 'r1',
    attempts = 5, error = 'boom', next_attempt_at = NULL WHERE instruction_cid = 'd1'`
  const d = await retryDeposit('d1')
  assert.equal(d?.state, 'receipted')
  assert.equal(d?.attempts, 0)
  assert.equal(d?.error, null)
  assert.equal((await retryDeposit('d2'))?.state, 'seen', 'only failed deposits change')
  assert.equal(await retryDeposit('missing'), undefined)
  assert.equal((await depositById('d1'))?.state, 'receipted')
})

test('a tick that outlives its lease finds out when it renews', { skip }, async () => {
  const sql = await db()
  assert.equal(await claim('a'), true)
  assert.equal(await claim('b'), false, 'held')
  assert.equal(await renew('a'), true)
  await sql`UPDATE lease SET until = now() - interval '1 second' WHERE name = 'tick'`
  assert.equal(await claim('b'), true, 'expired lease goes to the next tick')
  assert.equal(await renew('a'), false, 'the old holder cannot take it back')
})

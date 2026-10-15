// Needs a throwaway Postgres: DATABASE_URL must name a database with "test" in it. Skips otherwise.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import postgres from 'postgres'

const url = process.env.DATABASE_URL ?? ''
const skip = !/\/[^/]*test[^/]*$/.test(url) && 'set DATABASE_URL to a test database'

process.env.BETTER_AUTH_SECRET ??= 'test-secret-test-secret-test-secret-0'

const { db, closeDb, migrations } = await import('../lib/db.ts')
const { unfinishedDeposits, retryDeposit, depositById } = await import('../lib/deposits.ts')
const { claim, renew } = await import('../lib/tick.ts')
const { findCustomer, listCustomers } = await import('../lib/customers.ts')
const { businessDeposit, dismissDeposit, listDeposits } = await import('../lib/deposits.ts')
const { createBusiness, demoBusiness, membershipsOf } = await import('../lib/businesses.ts')
const { acceptInvite, createInvite, customersOfUser, inviteInfo } = await import('../lib/invites.ts')
const { getAuth } = await import('../lib/accounts.ts')
const { ageCookieValue, AGE_COOKIE } = await import('../lib/age.ts')
const { getMigrations } = await import('better-auth/db/migration')

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

test('existing customers and deposits become the demo business', { skip }, async () => {
  const demo = await demoBusiness()
  assert.equal(demo.id, 'biz_demo')
  assert.equal(demo.is_demo, true)
  assert.deepEqual((await listCustomers(demo.id)).map((c) => c.ref), ['Ada'])
  assert.equal((await listDeposits(demo.id)).length, 2)
})

test('Better Auth finds every table and column it needs', { skip }, async () => {
  const { toBeCreated, toBeAdded } = await getMigrations((await getAuth()).options)
  assert.deepEqual([...toBeCreated, ...toBeAdded].map((t) => t.table), [])
})

// Signs a new address in by email code, the way the sign-in screen does.
async function signIn(email: string, cookie = '') {
  const headers = new Headers({ cookie })
  const auth = await getAuth()
  await auth.api.sendVerificationOTP({ body: { email, type: 'sign-in' }, headers })
  const sql = await db()
  const [row] = await sql<{ value: string }[]>`
    SELECT value FROM auth_verification WHERE identifier = ${'sign-in-otp-' + email} ORDER BY "createdAt" DESC LIMIT 1`
  const otp = row.value.split(':')[0]
  return auth.api.signInEmailOTP({ body: { email, otp }, headers })
}

test('a new account needs a passed age screen; the result, not the date, is kept', { skip }, async () => {
  await assert.rejects(signIn('nocheck@example.com'), /date of birth/)
  await assert.rejects(signIn('under@example.com', `${AGE_COOKIE}=${ageCookieValue('under')}`), /date of birth/)
  await assert.rejects(signIn('forged@example.com', `${AGE_COOKIE}=over.forged`), /date of birth/)
  const res = await signIn('owner@example.com', `${AGE_COOKIE}=${ageCookieValue('over')}`)
  assert.equal(res.user.email, 'owner@example.com')
  const sql = await db()
  const [u] = await sql<{ ageCheck: string }[]>`SELECT "ageCheck" FROM auth_user WHERE email = 'owner@example.com'`
  assert.equal(u.ageCheck, 'over')
  // Signing in again later works without the age cookie.
  assert.equal((await signIn('owner@example.com')).user.email, 'owner@example.com')
})

test('a business sees only its own customers and deposits', { skip }, async () => {
  const sql = await db()
  const [owner] = await sql<{ id: string }[]>`SELECT id FROM auth_user WHERE email = 'owner@example.com'`
  const other = await createBusiness('Kestrel Pay', owner.id)
  assert.deepEqual((await membershipsOf(owner.id)).map((m) => [m.name, m.role]), [['Kestrel Pay', 'owner']])
  assert.equal(await findCustomer(other.id, 'Ada'), undefined)
  assert.equal(await businessDeposit(other.id, 'd1'), undefined)
  assert.equal((await listDeposits(other.id)).length, 0)
  assert.ok(await businessDeposit('biz_demo', 'd1'))
})

test('dismissing hides a failed deposit and records who did it', { skip }, async () => {
  const sql = await db()
  const [owner] = await sql<{ id: string }[]>`SELECT id FROM auth_user WHERE email = 'owner@example.com'`
  await sql`UPDATE deposits SET state = 'failed' WHERE instruction_cid = 'd2'`
  const d = await dismissDeposit('d2', owner.id)
  assert.equal(d?.dismissed_by, owner.id)
  assert.deepEqual((await listDeposits('biz_demo')).map((x) => x.instruction_cid), ['d1'])
})

test('an invite link works once, for one customer', { skip }, async () => {
  const sql = await db()
  const [owner] = await sql<{ id: string }[]>`SELECT id FROM auth_user WHERE email = 'owner@example.com'`
  const ada = (await findCustomer('biz_demo', 'Ada'))!
  const { url } = await createInvite(ada, owner.id)
  const token = url.split('/join/')[1]
  assert.equal((await inviteInfo(token)).state, 'valid')
  assert.equal((await inviteInfo('not-a-token')).state, 'unknown')

  const customer = await signIn('ada@example.com', `${AGE_COOKIE}=${ageCookieValue('over')}`)
  assert.equal((await acceptInvite(token, customer.user.id)).state, 'valid')
  assert.deepEqual((await customersOfUser(customer.user.id)).map((c) => [c.business_name, c.ref]), [['MagnaXchange', 'Ada']])
  assert.equal((await acceptInvite(token, owner.id)).state, 'used')
  assert.equal((await customersOfUser(owner.id)).length, 0)

  const expired = await createInvite(ada, owner.id)
  await sql`UPDATE customer_invites SET expires_at = now() - interval '1 second' WHERE used_at IS NULL`
  assert.equal((await acceptInvite(expired.url.split('/join/')[1], owner.id)).state, 'expired')
})

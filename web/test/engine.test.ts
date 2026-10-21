import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareDecimals, sumDecimals } from '../lib/decimal.ts'
import { DepositFailure, afterError, isTransient, resumeState } from '../lib/deposits.ts'
import { LedgerError } from '../lib/ledger.ts'
import { errorReason } from '../lib/views.ts'
import type { Deposit } from '../lib/db.ts'

test('sums ledger amounts exactly', () => {
  assert.equal(sumDecimals(['0.1', '0.2']), '0.3000000000')
  assert.equal(sumDecimals(['962.1619384779', '0.0000000001']), '962.1619384780')
  assert.equal(sumDecimals([]), '0.0000000000')
  assert.equal(sumDecimals(['-1.5', '1']), '-0.5000000000')
  assert.throws(() => sumDecimals(['1e5']))
  assert.throws(() => sumDecimals(['0.12345678901']))
  assert.equal(compareDecimals('5', '5.0000000000'), 0)
  assert.equal(compareDecimals('4.9999999999', '5'), -1)
})

const deposit = (over: Partial<Deposit> = {}): Deposit => ({
  instruction_cid: 'cid',
  business_id: 'biz',
  customer_id: 'cus',
  amount: '5.0000000000',
  instrument: 'Amulet@DSO',
  sender: 'Exchange',
  state: 'seen',
  accept_update_id: null,
  receipt_cid: null,
  holding_cid: null,
  sweep_instruction_cid: null,
  sweep_update_id: null,
  seen_offset: 1,
  error: null,
  attempts: 0,
  next_attempt_at: null,
  dismissed_at: null,
  dismissed_by: null,
  seen_at: '2026-10-10T00:00:00.000Z',
  updated_at: '2026-10-10T00:00:00.000Z',
  ...over,
})

const busy = new LedgerError(429, 'u', 'Traffic balance below reserved traffic amount')
const refused = new LedgerError(400, 'u', 'bad request')

test('overload, outages and network errors never fail a deposit', () => {
  assert.equal(isTransient(busy), true)
  assert.equal(isTransient(new LedgerError(503, 'u', '')), true)
  assert.equal(isTransient(new TypeError('fetch failed')), true)
  assert.equal(isTransient(refused), false)
  assert.equal(isTransient(new DepositFailure('gone')), false)

  let d = deposit()
  for (let i = 0; i < 50; i++) d = { ...d, ...afterError(d, 'seen', busy, 0) }
  assert.equal(d.state, 'seen')
  assert.equal(d.attempts, 50)
  assert.equal(d.next_attempt_at!.getTime(), 600_000, 'gap is capped at 10 minutes')
})

test('retries back off before a refused step fails', () => {
  let d = deposit()
  const gaps: number[] = []
  for (let i = 0; i < 5; i++) {
    const p = afterError(d, 'seen', refused, 0)
    if (p.next_attempt_at) gaps.push(p.next_attempt_at.getTime())
    d = { ...d, ...p }
  }
  assert.deepEqual(gaps, [5_000, 10_000, 20_000, 40_000])
  assert.equal(d.state, 'failed')
  assert.equal(d.next_attempt_at, null)
})

test('a certain failure fails at once', () => {
  assert.equal(afterError(deposit(), 'seen', new DepositFailure('instruction expired')).state, 'failed')
})

test('the count restarts once a deposit gets a step further', () => {
  const d = deposit({ state: 'accepted', attempts: 4 })
  const p = afterError(d, 'seen', refused, 0)
  assert.equal(p.attempts, 1)
  assert.equal(p.state, undefined)
})

test('a retried deposit resumes at the step it reached', () => {
  assert.equal(resumeState(deposit({ state: 'failed' })), 'seen')
  assert.equal(resumeState(deposit({ state: 'failed', accept_update_id: 'u1', holding_cid: 'h' })), 'accepted')
  assert.equal(resumeState(deposit({ state: 'failed', accept_update_id: 'u1', receipt_cid: 'r' })), 'receipted')
  assert.equal(resumeState(deposit({ state: 'failed', receipt_cid: 'r', sweep_instruction_cid: 's' })), 'sweeping')
})

test('screens get a reason without URLs', () => {
  const raw = refused.message
  assert.match(raw, /https?:|u:/)
  assert.equal(errorReason(raw), 'The ledger refused a step (HTTP 400).')
  assert.equal(errorReason(busy.message), 'The ledger is busy.')
  assert.equal(errorReason('instruction expired or was withdrawn before it was accepted'), 'Instruction expired or was withdrawn before it was accepted.')
  assert.equal(errorReason(null), null)
})

test('a deposit that arrives mid-tick starts at once instead of waiting for earlier ones', async () => {
  const { drain } = await import('../lib/tick.ts')
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const t0 = Date.now()
  const arrivals = [{ instruction_cid: 'anita', at: 0 }, { instruction_cid: 'yusuf', at: 30 }]
  const done = new Set<string>(), startedAt: Record<string, number> = {}
  await drain({
    scan: async () => 0,
    pending: async () => arrivals.filter((a) => Date.now() - t0 >= a.at && !done.has(a.instruction_cid)),
    advance: async (d) => { startedAt[d.instruction_cid] = Date.now() - t0; await sleep(120); done.add(d.instruction_cid) },
    budgetMs: 1_000,
    intervalMs: 10,
  })
  assert.deepEqual([...done].sort(), ['anita', 'yusuf'])
  assert.ok(startedAt.yusuf < 100, `yusuf started at ${startedAt.yusuf} ms, before anita finished`)
})

test('each deposit is advanced once per tick, and scanning stops at the budget', async () => {
  const { drain } = await import('../lib/tick.ts')
  let calls = 0, scans = 0
  await drain({
    scan: async () => (scans++, 0),
    pending: async () => [{ instruction_cid: 'stuck' }],
    advance: async () => { calls++; await new Promise((r) => setTimeout(r, 60)) },
    budgetMs: 40,
    intervalMs: 5,
  })
  assert.equal(calls, 1)
  assert.ok(scans >= 2)
})

test('the deposit webhook is signed over the exact body and carries the receipt evidence', async () => {
  const { sign, sweptEvent } = await import('../lib/webhooks.ts')
  const { createHmac } = await import('node:crypto')
  const body = '{"event":"deposit.swept"}'
  assert.equal(sign(body, 'k'), 'sha256=' + createHmac('sha256', 'k').update(body).digest('hex'))
  assert.notEqual(sign(body, 'k'), sign(body + ' ', 'k'))
  const e = sweptEvent(deposit({ state: 'swept', instrument: 'Amulet@dso::1', accept_update_id: 'a', receipt_cid: 'r', sweep_update_id: 's' }),
    { id: 'cus', business_id: 'biz', party: 'p::1', ref: 'Anita', account_cid: null, created_at: '' })
  assert.deepEqual([e.customerRef, e.instrumentId, e.instrumentAdmin, e.receiptCid, e.sweepUpdateId], ['Anita', 'Amulet', 'dso::1', 'r', 's'])
})

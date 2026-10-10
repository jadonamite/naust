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

import { createHash } from 'node:crypto'
import { db, type Customer, type Deposit } from './db.ts'
import {
  AMULET,
  TRANSFER_INSTRUCTION,
  activeContracts,
  createdIn,
  findArchivingTransaction,
  submit,
  treasuryParty,
  type CreatedEvent,
} from './ledger.ts'
import { acceptInstruction, transfer } from './registry.ts'

// seen -> accepted -> receipted -> sweeping -> swept | failed, keyed by the incoming instruction's contract ID.
// Every step checks the ledger before acting, so a restart at any point neither repeats nor skips a step.
export const DEPOSIT_RECEIPT = '#naust:Naust:DepositReceipt'
const MAX_ATTEMPTS = 5

// A problem retrying will not fix.
export class DepositFailure extends Error {}

const hashId = (prefix: string, cid: string) => `naust-${prefix}-${createHash('sha256').update(cid).digest('hex').slice(0, 32)}`
const now = () => new Date().toISOString()

async function patch(cid: string, fields: Partial<Deposit>): Promise<void> {
  const sql = await db()
  await sql`UPDATE deposits SET ${sql({ ...fields, updated_at: now() } as Record<string, any>)} WHERE instruction_cid = ${cid}`
}

async function get(cid: string): Promise<Deposit> {
  const sql = await db()
  const [d] = await sql<Deposit[]>`SELECT * FROM deposits WHERE instruction_cid = ${cid}`
  return d
}

export async function listDeposits(customerId?: string): Promise<Deposit[]> {
  const sql = await db()
  return customerId
    ? await sql<Deposit[]>`SELECT * FROM deposits WHERE customer_id = ${customerId} ORDER BY seen_at DESC`
    : await sql<Deposit[]>`SELECT * FROM deposits ORDER BY seen_at DESC`
}

export async function unfinishedDeposits(): Promise<Deposit[]> {
  const sql = await db()
  return await sql<Deposit[]>`SELECT * FROM deposits WHERE state NOT IN ('swept', 'failed') ORDER BY seen_at`
}

// Record an incoming instruction once. Returns true if it was new.
export async function recordSeen(instruction: CreatedEvent, customer: Customer, ledgerOffset: number): Promise<boolean> {
  const t = instruction.createArgument.transfer
  const sql = await db()
  const res = await sql`
    INSERT INTO deposits
      (instruction_cid, customer_id, amount, instrument, sender, state, seen_offset, seen_at, updated_at)
    VALUES (${instruction.contractId}, ${customer.id}, ${t.amount}, ${`${t.instrumentId.id}@${t.instrumentId.admin}`},
      ${t.sender}, 'seen', ${ledgerOffset}, ${now()}, ${now()})
    ON CONFLICT (instruction_cid) DO NOTHING`
  return res.count > 0
}

const isAmuletOf = (owner: string) => (c: CreatedEvent) => c.templateId.endsWith(AMULET) && c.createArgument.owner === owner
const isInstructionTo = (receiver: string) => (c: CreatedEvent) =>
  c.templateId.endsWith(TRANSFER_INSTRUCTION) && c.createArgument.transfer.receiver === receiver

async function accept(d: Deposit, customer: Customer): Promise<void> {
  const pending = (await activeContracts(customer.party, TRANSFER_INSTRUCTION)).some((c) => c.contractId === d.instruction_cid)
  let updateId: string
  let created: CreatedEvent[]
  if (pending) {
    const tx = await acceptInstruction(d.instruction_cid, customer.party)
    updateId = tx.updateId
    created = createdIn(tx)
  } else {
    const found = await findArchivingTransaction(customer.party, d.instruction_cid, d.seen_offset)
    if (!found) throw new DepositFailure('instruction is gone and no archiving transaction was found')
    updateId = found.updateId
    created = found.created
  }
  const holding = created.find(isAmuletOf(customer.party))
  if (!holding) throw new DepositFailure('instruction expired or was withdrawn before it was accepted')
  await patch(d.instruction_cid, { state: 'accepted', accept_update_id: updateId, holding_cid: holding.contractId })
}

async function findReceipt(business: string, instructionCid: string): Promise<CreatedEvent | undefined> {
  return (await activeContracts(business, ':Naust:DepositReceipt')).find(
    (r) => r.createArgument.sourceInstructionCid === instructionCid,
  )
}

async function receipt(d: Deposit, customer: Customer, business: string): Promise<void> {
  let r = await findReceipt(business, d.instruction_cid)
  if (!r) {
    const at = d.instrument.indexOf('@')
    const tx = await submit({
      actAs: business,
      commandId: hashId('receipt', d.instruction_cid),
      command: {
        CreateCommand: {
          templateId: DEPOSIT_RECEIPT,
          createArguments: {
            business,
            customer: customer.party,
            customerRef: customer.ref,
            amount: d.amount,
            instrumentAdmin: d.instrument.slice(at + 1),
            instrumentId: d.instrument.slice(0, at),
            sender: d.sender,
            sourceInstructionCid: d.instruction_cid,
            acceptUpdateId: d.accept_update_id,
            sweepUpdateId: null,
            receivedAt: d.seen_at,
          },
        },
      },
    })
    r = createdIn(tx).find((e) => e.templateId.endsWith(':Naust:DepositReceipt'))!
  }
  await patch(d.instruction_cid, { state: 'receipted', receipt_cid: r.contractId })
}

async function sweep(d: Deposit, customer: Customer, treasury: string): Promise<void> {
  if (d.state === 'receipted') await patch(d.instruction_cid, { state: 'sweeping' })
  let instructionCid = d.sweep_instruction_cid
  let sweepUpdateId = d.sweep_update_id

  if (!instructionCid && !sweepUpdateId) {
    const holding = (await activeContracts(customer.party, AMULET)).find((c) => c.contractId === d.holding_cid)
    if (holding) {
      const { tx, kind } = await transfer({
        sender: customer.party,
        receiver: treasury,
        holdings: [holding],
        amount: holding.createArgument.amount.initialAmount,
      })
      if (kind === 'offer') instructionCid = createdIn(tx).find(isInstructionTo(treasury))?.contractId ?? null
      else sweepUpdateId = tx.updateId
    } else {
      // The holding already left: the sweep was submitted before a restart.
      const found = await findArchivingTransaction(customer.party, d.holding_cid!, d.seen_offset)
      if (!found) throw new DepositFailure('deposit holding is gone and no sweep transaction was found')
      instructionCid = found.created.find(isInstructionTo(treasury))?.contractId ?? null
      if (!instructionCid) sweepUpdateId = found.updateId
    }
    if (!instructionCid && !sweepUpdateId) throw new DepositFailure('sweep produced neither an offer nor a direct transfer')
    await patch(d.instruction_cid, { sweep_instruction_cid: instructionCid, sweep_update_id: sweepUpdateId })
  }

  if (instructionCid && !sweepUpdateId) {
    const pending = (await activeContracts(treasury, TRANSFER_INSTRUCTION)).some((c) => c.contractId === instructionCid)
    if (pending) {
      sweepUpdateId = (await acceptInstruction(instructionCid, treasury)).updateId
    } else {
      const found = await findArchivingTransaction(treasury, instructionCid, d.seen_offset)
      if (!found?.created.some(isAmuletOf(treasury))) {
        throw new DepositFailure('sweep offer to treasury expired or was withdrawn before acceptance')
      }
      sweepUpdateId = found.updateId
    }
    await patch(d.instruction_cid, { sweep_update_id: sweepUpdateId })
  }
}

async function recordSweep(d: Deposit, business: string): Promise<void> {
  const r = await findReceipt(business, d.instruction_cid)
  if (!r) throw new DepositFailure('receipt not found on the ledger')
  let receiptCid = r.contractId
  if (r.createArgument.sweepUpdateId == null) {
    const tx = await submit({
      actAs: business,
      commandId: hashId('record', d.instruction_cid),
      command: {
        ExerciseCommand: {
          templateId: DEPOSIT_RECEIPT,
          contractId: r.contractId,
          choice: 'Receipt_RecordSweep',
          choiceArgument: { sweepUpdateId_: d.sweep_update_id },
        },
      },
    })
    receiptCid = createdIn(tx).find((e) => e.templateId.endsWith(':Naust:DepositReceipt'))!.contractId
  }
  await patch(d.instruction_cid, { state: 'swept', receipt_cid: receiptCid, error: null })
}

// Drive one deposit as far as it will go. Errors are recorded; transient ones retry on the next poll.
export async function advance(cid: string, customer: Customer): Promise<Deposit> {
  const treasury = await treasuryParty()
  try {
    let d = await get(cid)
    if (d.state === 'seen') await accept(d, customer), (d = await get(cid))
    if (d.state === 'accepted') await receipt(d, customer, treasury), (d = await get(cid))
    if (d.state === 'receipted' || d.state === 'sweeping') {
      if (!d.sweep_update_id) await sweep(d, customer, treasury), (d = await get(cid))
      await recordSweep(d, treasury)
    }
  } catch (e) {
    const d = await get(cid)
    const attempts = d.attempts + 1
    const fatal = e instanceof DepositFailure || attempts >= MAX_ATTEMPTS
    await patch(cid, { attempts, error: (e as Error).message.slice(0, 500), ...(fatal ? { state: 'failed' as const } : {}) })
  }
  return await get(cid)
}

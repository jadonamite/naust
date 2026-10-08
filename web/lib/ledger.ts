import { randomUUID } from 'node:crypto'
import { env } from './env.ts'
import { accessToken, invalidateToken, ledgerUserId } from './auth.ts'

// JSON Ledger API v2 client.
export class LedgerError extends Error {
  readonly status: number
  readonly url: string
  readonly body: string
  constructor(status: number, url: string, body: string) {
    super(`Ledger ${status} on ${url}: ${body.slice(0, 300)}`)
    this.status = status
    this.url = url
    this.body = body
  }
  get forbidden() {
    return this.status === 401 || this.status === 403
  }
  get retryable() {
    return this.status === 429 || this.status >= 500
  }
}

export async function call<T = any>(url: string, body?: unknown, retried = false): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: 'Bearer ' + (await accessToken()), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401 && !retried) {
    invalidateToken()
    return call(url, body, true)
  }
  const text = await res.text()
  if (!res.ok) throw new LedgerError(res.status, url, text)
  return text ? JSON.parse(text) : (undefined as T)
}

export type CreatedEvent = {
  contractId: string
  templateId: string
  createArgument: any
  createdAt: string
  offset: number
}

export type DisclosedContract = {
  templateId: string
  contractId: string
  createdEventBlob: string
  synchronizerId: string
}

export type Transaction = { updateId: string; offset: number; events: any[] }

export async function ledgerEnd(): Promise<number> {
  return (await call(env.jsonApi + '/v2/state/ledger-end')).offset
}

// Active contracts visible to one party, optionally narrowed to template IDs ending with a suffix.
export async function activeContracts(party: string, templateSuffix?: string): Promise<CreatedEvent[]> {
  const rows = await call<any[]>(env.jsonApi + '/v2/state/active-contracts', {
    activeAtOffset: await ledgerEnd(),
    verbose: false,
    eventFormat: {
      filtersByParty: {
        [party]: {
          cumulative: [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }],
        },
      },
    },
  })
  const events = rows.map((r) => r.contractEntry?.JsActiveContract?.createdEvent).filter(Boolean) as CreatedEvent[]
  return templateSuffix ? events.filter((e) => e.templateId.endsWith(templateSuffix)) : events
}

export async function submit(opts: {
  actAs: string
  command: unknown
  disclosed?: DisclosedContract[]
  commandId?: string
}): Promise<Transaction> {
  const res = await call(env.jsonApi + '/v2/commands/submit-and-wait-for-transaction', {
    commands: {
      commands: [opts.command],
      commandId: opts.commandId ?? 'naust-' + randomUUID(),
      userId: await ledgerUserId(),
      actAs: [opts.actAs],
      readAs: [opts.actAs],
      disclosedContracts: opts.disclosed ?? [],
    },
  })
  return res.transaction
}

// The treasury is the ledger user's primary (wallet) party. It never changes, so it is looked up once.
let treasury: Promise<string> | undefined
export function treasuryParty(): Promise<string> {
  treasury ??= (async () => {
    const id = await ledgerUserId()
    const res = await call(env.jsonApi + '/v2/users/' + encodeURIComponent(id))
    const party = res.user?.primaryParty
    if (!party) throw new Error(`Ledger user ${id} has no primary party`)
    return party
  })().catch((e) => ((treasury = undefined), Promise.reject(e)))
  return treasury
}

export const AMULET = ':Splice.Amulet:Amulet'
export const TRANSFER_INSTRUCTION = 'AmuletTransferInstruction:AmuletTransferInstruction'

export function amuletBalance(contracts: CreatedEvent[]): number {
  return contracts
    .filter((c) => c.templateId.endsWith(AMULET))
    .reduce((sum, c) => sum + Number(c.createArgument.amount.initialAmount), 0)
}

const wildcard = (party: string) => ({
  filtersByParty: {
    [party]: { cumulative: [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }] },
  },
  verbose: false,
})

// The transaction that archived a contract, searched from an offset onward. Used to recover after a crash.
export async function findArchivingTransaction(
  party: string,
  contractId: string,
  fromOffset: number,
): Promise<{ updateId: string; created: CreatedEvent[] } | undefined> {
  const end = await ledgerEnd()
  let begin = fromOffset
  while (begin < end) {
    const page = await call<any[]>(env.jsonApi + '/v2/updates?limit=200', {
      beginExclusive: begin,
      endInclusive: end,
      updateFormat: {
        includeTransactions: { eventFormat: wildcard(party), transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA' },
      },
    })
    if (!page.length) return undefined
    const pageStart = begin
    for (const u of page) {
      const tx = u.update?.Transaction?.value
      const offset = tx?.offset ?? u.update?.OffsetCheckpoint?.value?.offset ?? begin
      begin = Math.max(begin, offset)
      if (!tx?.events?.some((e: any) => e.ArchivedEvent?.contractId === contractId)) continue
      return {
        updateId: tx.updateId,
        created: tx.events.map((e: any) => e.CreatedEvent).filter(Boolean),
      }
    }
    if (begin === pageStart) return undefined
  }
  return undefined
}

export function createdIn(tx: { events: any[] }): CreatedEvent[] {
  return tx.events.map((e: any) => e.CreatedEvent).filter(Boolean)
}

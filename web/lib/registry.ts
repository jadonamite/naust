import { env } from './env.ts'
import { call, submit, type CreatedEvent, type DisclosedContract, type Transaction } from './ledger.ts'

// Token-standard registry calls through the validator's scan proxy. Request shapes verified on DevNet (T009).
const REG = () => env.validatorApi + '/scan-proxy/registry/transfer-instruction/v1'
const IFACE = '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1'
const EMPTY = { values: {} }

type ChoiceContext = { choiceContextData: unknown; disclosedContracts: any[] }

const disclosed = (ctx: ChoiceContext): DisclosedContract[] =>
  ctx.disclosedContracts.map((d) => ({
    templateId: d.templateId,
    contractId: d.contractId,
    createdEventBlob: d.createdEventBlob,
    synchronizerId: d.synchronizerId ?? '',
  }))

export async function acceptContext(instructionCid: string): Promise<ChoiceContext> {
  return call(`${REG()}/${instructionCid}/choice-contexts/accept`, { meta: {} })
}

// Accept a pending transfer instruction as its receiver.
export async function acceptInstruction(instructionCid: string, receiver: string): Promise<Transaction> {
  const ctx = await acceptContext(instructionCid)
  return submit({
    actAs: receiver,
    disclosed: disclosed(ctx),
    command: {
      ExerciseCommand: {
        templateId: IFACE + ':TransferInstruction',
        contractId: instructionCid,
        choice: 'TransferInstruction_Accept',
        choiceArgument: { extraArgs: { context: ctx.choiceContextData, meta: EMPTY } },
      },
    },
  })
}

export type TransferKind = 'offer' | 'direct' | 'self'

// Send holdings from one party to another. 'offer' means the receiver still has to accept.
export async function transfer(opts: {
  sender: string
  receiver: string
  holdings: CreatedEvent[]
  amount: string
  instrumentId?: string
}): Promise<{ tx: Transaction; kind: TransferKind }> {
  if (!opts.holdings.length) throw new Error('transfer needs at least one input holding')
  const admin: string = opts.holdings[0].createArgument.dso
  const now = Date.now()
  const transfer = {
    sender: opts.sender,
    receiver: opts.receiver,
    amount: opts.amount,
    instrumentId: { admin, id: opts.instrumentId ?? 'Amulet' },
    requestedAt: new Date(now).toISOString(),
    executeBefore: new Date(now + 3_600_000).toISOString(),
    inputHoldingCids: opts.holdings.map((h) => h.contractId),
    meta: EMPTY,
  }
  const factory = await call<{ factoryId: string; transferKind: TransferKind; choiceContext: ChoiceContext }>(
    `${REG()}/transfer-factory`,
    {
      choiceArguments: { expectedAdmin: admin, transfer, extraArgs: { context: EMPTY, meta: EMPTY } },
      excludeDebugFields: true,
    },
  )
  const tx = await submit({
    actAs: opts.sender,
    disclosed: disclosed(factory.choiceContext),
    command: {
      ExerciseCommand: {
        templateId: IFACE + ':TransferFactory',
        contractId: factory.factoryId,
        choice: 'TransferFactory_Transfer',
        choiceArgument: {
          expectedAdmin: admin,
          transfer,
          extraArgs: { context: factory.choiceContext.choiceContextData, meta: EMPTY },
        },
      },
    },
  })
  return { tx, kind: factory.transferKind }
}
